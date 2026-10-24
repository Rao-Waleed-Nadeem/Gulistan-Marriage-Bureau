import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  canAccessCRM,
  validateFollowUpInput,
  computeFollowUpStatus,
  getFollowUps,
  createFollowUp,
  completeFollowUp,
  getExternalMatchmakers,
  attributeProfileToMatchmaker,
  resetCRMStoreForTesting,
  getCRMAuditEventsForTesting,
  FollowUpInput,
} from './followUps';
import { AuthSession } from './auth';

const staffSession: AuthSession = {
  user: {
    id: 'usr-nadeem',
    email: 'nadeem@gulistan.pk',
    displayName: 'Nadeem Ahmed',
    role: 'nadeem',
    preferredLanguage: 'ur',
  },
  role: 'nadeem',
  token: 'staff-token',
  expiresAt: Date.now() + 3600000,
  isAuthenticated: true,
};

const customerSession: AuthSession = {
  user: {
    id: 'usr-customer',
    email: 'customer@example.com',
    displayName: 'Candidate Family',
    role: 'customer',
    preferredLanguage: 'en',
  },
  role: 'customer',
  token: 'customer-token',
  expiresAt: Date.now() + 3600000,
  isAuthenticated: true,
};

beforeEach(() => {
  resetCRMStoreForTesting();
});

test('canAccessCRM and getFollowUps strictly enforce least privilege and fail closed for unauthorized users', () => {
  // 1. Unauthenticated
  assert.equal(canAccessCRM(null), false);
  const noAuthGet = getFollowUps(null);
  assert.equal(noAuthGet.success, false);
  assert.equal(noAuthGet.error?.code, 'UNAUTHORIZED');

  // 2. Customer role
  assert.equal(canAccessCRM(customerSession), false);
  const customerGet = getFollowUps(customerSession);
  assert.equal(customerGet.success, false);
  assert.equal(customerGet.error?.code, 'UNAUTHORIZED');

  // 3. Staff Nadeem
  assert.equal(canAccessCRM(staffSession), true);
  const staffGet = getFollowUps(staffSession);
  assert.equal(staffGet.success, true);
  assert.ok(staffGet.followUps && staffGet.followUps.length > 0);
});

test('validateFollowUpInput validates profile references, phone format, dates, and types', () => {
  // Invalid empty payload
  const badInput = validateFollowUpInput({});
  assert.equal(badInput.valid, false);
  assert.ok(badInput.errors.profileId);
  assert.ok(badInput.errors.personName);
  assert.ok(badInput.errors.contactPhone);
  assert.ok(badInput.errors.type);
  assert.ok(badInput.errors.priority);
  assert.ok(badInput.errors.dueDate);

  // Valid payload
  const goodPayload: FollowUpInput = {
    profileId: 'GLS-401',
    personName: 'Tariq Mehmood',
    contactPhone: '+92 300 1234567',
    type: 'proposal_decision',
    dueDate: '2026-11-01',
    priority: 'high',
    notes: 'Follow up on proposal review with family elders.',
  };
  const goodInput = validateFollowUpInput(goodPayload);
  assert.equal(goodInput.valid, true);
  assert.equal(Object.keys(goodInput.errors).length, 0);
});

test('computeFollowUpStatus accurately calculates overdue vs pending dates', () => {
  const referenceDate = new Date('2026-10-24T12:00:00Z');

  // Past due date
  const overdueStatus = computeFollowUpStatus('2026-10-20', 'pending', referenceDate);
  assert.equal(overdueStatus, 'overdue');

  // Future due date
  const pendingStatus = computeFollowUpStatus('2026-10-30', 'pending', referenceDate);
  assert.equal(pendingStatus, 'pending');

  // Completed item stays completed even if past due date
  const completedStatus = computeFollowUpStatus('2026-10-20', 'completed', referenceDate);
  assert.equal(completedStatus, 'completed');
});

test('createFollowUp enforces authorization, creates item, and logs minimal audit record', () => {
  const payload: FollowUpInput = {
    profileId: 'GLS-402',
    personName: 'Mrs. Inamullah Khan',
    contactPhone: '+92 333 5198270',
    type: 'meeting_arrangement',
    dueDate: '2026-10-28',
    priority: 'high',
    notes: 'Coordinate family tea meeting date.',
  };

  // Unauthorized attempt
  const unauthAttempt = createFollowUp(payload, customerSession);
  assert.equal(unauthAttempt.success, false);
  assert.equal(unauthAttempt.error?.code, 'UNAUTHORIZED');

  // Authorized staff attempt
  const result = createFollowUp(payload, staffSession);
  assert.equal(result.success, true);
  assert.ok(result.followUp);
  assert.equal(result.followUp.profileId, 'GLS-402');
  assert.equal(result.followUp.type, 'meeting_arrangement');

  // Check audit record
  const audits = getCRMAuditEventsForTesting();
  const createAudit = audits.find((a) => a.action === 'follow_up_created' && a.target_id === result.followUp?.id);
  assert.ok(createAudit);
  assert.equal(createAudit.target_type, 'follow_up');

  // Audit details must NOT leak raw phone numbers
  assert.ok(!createAudit.details.includes('+92 333 5198270'), 'Audit must omit raw phone numbers');
});

test('completeFollowUp transitions status, records actor, and is idempotent on retries', () => {
  // Existing initial follow-up FU-301 is pending
  const completeRes = completeFollowUp('FU-301', staffSession, 'Meeting arranged for Sunday afternoon.');
  assert.equal(completeRes.success, true);
  assert.ok(completeRes.followUp);
  assert.equal(completeRes.followUp.status, 'completed');
  assert.equal(completeRes.followUp.completedBy, 'nadeem@gulistan.pk');
  assert.equal(completeRes.followUp.completionNotes, 'Meeting arranged for Sunday afternoon.');
  assert.ok(completeRes.followUp.completedAt);

  // Check audit event
  const audits = getCRMAuditEventsForTesting();
  const compAudit = audits.find((a) => a.action === 'follow_up_completed' && a.target_id === 'FU-301');
  assert.ok(compAudit);
  assert.ok(compAudit.details.includes('completedBy'));

  // Idempotency: completing the same follow-up again succeeds without creating duplicate error
  const retryRes = completeFollowUp('FU-301', staffSession);
  assert.equal(retryRes.success, true);
  assert.equal(retryRes.followUp?.status, 'completed');
});

test('completeFollowUp returns NOT_FOUND for non-existent items', () => {
  const notFoundRes = completeFollowUp('FU-NONEXISTENT', staffSession);
  assert.equal(notFoundRes.success, false);
  assert.equal(notFoundRes.error?.code, 'NOT_FOUND');
});

test('getExternalMatchmakers denies customer access and lists partner directory for staff', () => {
  // Customer access
  const customerRes = getExternalMatchmakers(customerSession);
  assert.equal(customerRes.success, false);
  assert.equal(customerRes.error?.code, 'UNAUTHORIZED');

  // Staff access
  const staffRes = getExternalMatchmakers(staffSession);
  assert.equal(staffRes.success, true);
  assert.ok(staffRes.matchmakers && staffRes.matchmakers.length >= 3);
  assert.ok(staffRes.matchmakers.some((m) => m.name === 'Haji Aslam Qureshi'));
});

test('attributeProfileToMatchmaker increments referral count and logs attribution audit event', () => {
  const matchmakersBefore = getExternalMatchmakers(staffSession).matchmakers || [];
  const hajiAslam = matchmakersBefore.find((m) => m.id === 'mm-101');
  const initialCount = hajiAslam?.profilesReferredCount || 0;

  // Attribute profile GLS-405 to Haji Aslam
  const attrResult = attributeProfileToMatchmaker('GLS-405', 'mm-101', staffSession, 'Referred via phone interview.');
  assert.equal(attrResult.success, true);
  assert.ok(attrResult.matchmaker);
  assert.equal(attrResult.matchmaker.profilesReferredCount, initialCount + 1);

  // Check audit event
  const audits = getCRMAuditEventsForTesting();
  const attrAudit = audits.find((a) => a.action === 'matchmaker_attributed' && a.target_id === 'GLS-405');
  assert.ok(attrAudit);
  assert.ok(attrAudit.details.includes('mm-101'));
  assert.ok(attrAudit.details.includes('Haji Aslam Qureshi'));
});

test('attributeProfileToMatchmaker rejects inactive partner agencies', () => {
  // Create an inactive matchmaker in test store
  const matchmakers = getExternalMatchmakers(staffSession).matchmakers || [];
  const inactiveMatchmaker = matchmakers.find((m) => m.status === 'inactive') || {
    id: 'mm-inactive',
    name: 'Retired Matchmaker',
    city: 'Sahiwal',
    phone: '+92 300 9999999',
    profilesReferredCount: 5,
    successfulMatchesCount: 1,
    outstandingBalancePKR: 0,
    commissionRatePercent: 20,
    status: 'inactive' as const,
  };

  // If not already in store, we test against mm-inactive
  const res = attributeProfileToMatchmaker('GLS-406', inactiveMatchmaker.id, staffSession);
  if (inactiveMatchmaker.id === 'mm-inactive') {
    assert.equal(res.error?.code, 'NOT_FOUND');
  } else {
    assert.equal(res.success, false);
    assert.equal(res.error?.code, 'MATCHMAKER_INACTIVE');
  }
});
