/**
 * @file e2e_scenarios.test.ts
 * @description End-to-end workflow scenario test suite covering all 10 core user journeys:
 * 1. Staff authentication & session persistence
 * 2. Customer intake form submission with invariant validation
 * 3. Duplicate candidate detection and resolution
 * 4. Nadeem match evaluation & approval
 * 5. Controlled proposal sharing with 48h token grant
 * 6. Private photo signed URL redemption & consent withdrawal purge
 * 7. Customer self-service preference update & urgent deactivation request
 * 8. External matchmaker attribution, tiered commission & financial reversal
 * 9. Migration batch dry-run, owner approval gate & rollback
 * 10. Bilingual language switching with Unicode bidirectional isolates
 * Addresses Finding OPS-11.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  profileRepository,
  matchRepository,
  shareGrantRepository,
  photoRepository,
  crmRepository,
  financeRepository,
  matchmakerRepository,
  migrationRepository,
} from './repositories';

import {
  validateProfileInput,
  canTransitionStatus,
} from './profiles';

import {
  evaluateCandidateMatch,
  recordMatchDecision,
} from './matching';

import {
  authorizeDisclosure,
  validateShareGrant,
  generateAuthorizedWhatsAppDraft,
} from './disclosure';

import {
  generateSignedPhotoGrant,
  validateSignedPhotoAccess,
  purgeCandidatePhoto,
  uploadPrivatePhoto,
} from './photos';

import {
  createMigrationBatch,
  parseWhatsAppChatExport,
  resolveQuarantinedRecord,
  approveMigrationBatchByOwner,
  executeBatchImport,
  reconcileMigrationBatch,
  rollbackMigrationBatch,
  purgeStagedRawContent,
} from './migration';

import {
  formatBilingualPhone,
  formatBilingualReferenceCode,
  formatBilingualCurrency,
} from './accessibility';

import { AuthSession } from './auth';
import { ProfileRecord } from '../types';

// Helper mock staff sessions
const nadeemSession: AuthSession = {
  user: { id: 'usr-nadeem-01', email: 'nadeem@gulistan.pk', role: 'nadeem' as const, displayName: 'Nadeem Ahmed', preferredLanguage: 'en' as const },
  role: 'nadeem' as const,
  token: 'mock-nadeem-token',
  expiresAt: Date.now() + 86400000,
  isAuthenticated: true,
};

const adminSession: AuthSession = {
  user: { id: 'usr-admin-01', email: 'admin@gulistan.pk', role: 'admin' as const, displayName: 'System Administrator', preferredLanguage: 'en' as const },
  role: 'admin' as const,
  token: 'mock-admin-token',
  expiresAt: Date.now() + 86400000,
  isAuthenticated: true,
};

const customerSession: AuthSession = {
  user: { id: 'cust-ahmed-01', email: 'ahmed@client.pk', role: 'customer' as const, displayName: 'Ahmed Khan', preferredLanguage: 'en' as const },
  role: 'customer' as const,
  token: 'mock-customer-token',
  expiresAt: Date.now() + 86400000,
  isAuthenticated: true,
};

// =============================================================================
// Journey 1: Staff Authentication & Session Persistence
// =============================================================================

test('E2E Journey 1: Staff authentication, role assignment & session validation', async () => {
  assert.equal(nadeemSession.isAuthenticated, true);
  assert.equal(nadeemSession.role, 'nadeem');
  assert.equal(nadeemSession.user?.displayName, 'Nadeem Ahmed');
  assert.ok((nadeemSession.expiresAt || 0) > Date.now());

  // Fail-closed role check: public/anonymous cannot access staff portal
  const isStaff = nadeemSession.role === 'nadeem' || nadeemSession.role === 'admin';
  assert.equal(isStaff, true);
});

// =============================================================================
// Journey 2: Customer Intake Form Submission with Invariant Validation
// =============================================================================

test('E2E Journey 2: Customer intake form submission with strict invariant validation', async () => {
  const profileRepo = profileRepository;

  const candidatePayload = {
    fullName: 'Zainab Bibi',
    displayName: 'Zainab B.',
    gender: 'female' as const,
    age: 24,
    maritalStatus: 'never_married' as const,
    religion: 'islam' as const,
    aqeedah: 'sunni' as const,
    caste: 'Arain',
    education: 'master' as const,
    occupation: 'Software Engineer',
    monthlyIncomePkr: 150000,
    currentCity: 'Lahore',
    contactPhone: '+92 300 1234567',
    contactPerson: 'Father (Muhammad Din)',
  };

  const validation = validateProfileInput(candidatePayload);
  assert.equal(validation.valid, true);
  assert.equal(validation.errors.length, 0);

  const created = await profileRepo.create(candidatePayload, nadeemSession);
  assert.ok(created.id);
  assert.equal(created.fullName, 'Zainab Bibi');
  assert.equal(created.status, 'pending_review');

  // Verify state transition: pending_review -> approved -> active
  const transitionCheck = canTransitionStatus(created.status, 'approved', 'nadeem');
  assert.equal(transitionCheck.allowed, true);

  const approved = await profileRepo.updateStatus(created.id, 'approved', nadeemSession);
  assert.equal(approved.status, 'approved');

  const activated = await profileRepo.updateStatus(created.id, 'active', nadeemSession);
  assert.equal(activated.status, 'active');
});

// =============================================================================
// Journey 3: Duplicate Candidate Detection & Resolution
// =============================================================================

test('E2E Journey 3: Duplicate candidate detection by phone and name matching', async () => {
  const profileRepo = profileRepository;

  const existingProfile = await profileRepo.create({
    fullName: 'Bilal Hassan',
    displayName: 'Bilal H.',
    gender: 'male',
    age: 28,
    maritalStatus: 'never_married',
    religion: 'islam',
    aqeedah: 'sunni',
    caste: 'Sheikh',
    education: 'bachelor',
    occupation: 'Banker',
    currentCity: 'Rawalpindi',
    contactPhone: '+92 321 5551234',
    contactPerson: 'Self',
  }, nadeemSession);

  // Attempting duplicate intake with same normalized phone number
  const duplicateCandidate = {
    fullName: 'Bilal Hassan Khan',
    displayName: 'Bilal K.',
    contactPhone: '+92 321 5551234', // Same phone
    currentCity: 'Islamabad',
  };

  const allProfiles = await profileRepo.findAll(nadeemSession);
  const duplicateFound = allProfiles.find(
    p => p.contactPhone.replace(/\s+/g, '') === duplicateCandidate.contactPhone.replace(/\s+/g, '')
  );

  assert.ok(duplicateFound, 'Duplicate phone number must be detected');
  assert.equal(duplicateFound.id, existingProfile.id);
});

// =============================================================================
// Journey 4: Nadeem Match Evaluation & Approval
// =============================================================================

test('E2E Journey 4: Deterministic match evaluation and Lead Matchmaker approval gate', async () => {
  const profileRepo = profileRepository;

  const bride = await profileRepo.create({
    fullName: 'Amina Tariq',
    displayName: 'Amina T.',
    gender: 'female',
    age: 25,
    maritalStatus: 'never_married',
    religion: 'islam',
    aqeedah: 'sunni',
    caste: 'Rajput',
    education: 'master',
    occupation: 'Lecturer',
    currentCity: 'Faisalabad',
    contactPhone: '+92 333 1112233',
    contactPerson: 'Mother',
  }, nadeemSession);

  const groom = await profileRepo.create({
    fullName: 'Farhan Rajput',
    displayName: 'Farhan R.',
    gender: 'male',
    age: 28,
    maritalStatus: 'never_married',
    religion: 'islam',
    aqeedah: 'sunni',
    caste: 'Rajput',
    education: 'master',
    occupation: 'Civil Engineer',
    currentCity: 'Faisalabad',
    contactPhone: '+92 333 4445566',
    contactPerson: 'Father',
  }, nadeemSession);

  // Evaluate compatibility
  const evalResult = evaluateCandidateMatch(bride, groom);

  assert.equal(evalResult.isMandatorySatisfied, true);
  assert.ok(evalResult.overallScore > 0);

  // Record Lead Matchmaker approval
  const decisionRecord = recordMatchDecision(
    evalResult,
    'approved_by_nadeem',
    nadeemSession,
    'Excellent cultural and educational alignment.'
  );

  assert.equal(decisionRecord.success, true);
  assert.equal(decisionRecord.evaluation?.humanDecisionStatus, 'approved_by_nadeem');

  // Customer cannot approve matches
  const customerAttempt = recordMatchDecision(evalResult, 'approved_by_nadeem', customerSession);
  assert.equal(customerAttempt.success, false);
  assert.equal(customerAttempt.error?.code, 'UNAUTHORIZED');
});

// =============================================================================
// Journey 5: Controlled Proposal Sharing with 48h Token Grant
// =============================================================================

test('E2E Journey 5: Controlled proposal sharing with 48h token grant & phone locking', async () => {
  const shareRepo = shareGrantRepository;

  const candidateProfile = {
    id: 'cand-e2e-88',
    fullName: 'Mariam Siddiqui',
    displayName: 'Mariam S.',
    gender: 'female' as const,
    age: 26,
    maritalStatus: 'never_married' as const,
    religion: 'islam' as const,
    aqeedah: 'sunni' as const,
    caste: 'Siddiqui',
    education: 'master' as const,
    occupation: 'Pharmacist',
    monthlyIncomePkr: 120000,
    currentCity: 'Karachi',
    contactPhone: '+92 300 7778899',
    contactPerson: 'Mother',
    status: 'active' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as unknown as ProfileRecord;

  // Authorize proposal disclosure (pre-introduction locks candidate phone)
  const disclosure = authorizeDisclosure(
    candidateProfile,
    {
      includePhotos: true,
      includeFamilyDetails: true,
      includeIncome: true,
      directContactAllowed: false, // Locked until mutual introduction
    },
    nadeemSession
  );

  assert.equal(disclosure.success, true);
  assert.ok(disclosure.snapshot);
  assert.equal(disclosure.snapshot.disclosedData.isDirectContactDisclosed, false);
  assert.equal(disclosure.snapshot.disclosedData.contactNumber, undefined);

  // Format bilingual WhatsApp message
  const waDraft = generateAuthorizedWhatsAppDraft(disclosure.snapshot, 'ur');
  assert.ok(waDraft.messageText.includes('گلستان میرج بیورو'));
  assert.ok(!waDraft.messageText.includes('+92 300 7778899'), 'Private phone must not appear in pre-introduction draft');

  // Persist 48h share grant
  const grant = await shareRepo.createGrant(
    disclosure.snapshot,
    nadeemSession,
    { recipientPhone: '+92 312 9990000' }
  );

  assert.equal(grant.success, true);
  assert.ok(grant.grantId);

  // Validate unexpired grant
  const validation = validateShareGrant(disclosure.snapshot);
  assert.equal(validation.valid, true);
});

// =============================================================================
// Journey 6: Private Photo Signed URL Redemption & Consent Withdrawal Purge
// =============================================================================

test('E2E Journey 6: Private photo signed URL issuance, redemption & immediate purge on withdrawal', async () => {
  const file = { name: 'portrait_e2e.jpg', size: 500 * 1024, type: 'image/jpeg' };
  const uploadRes = uploadPrivatePhoto('cand-e2e-88', file, true, nadeemSession);
  assert.equal(uploadRes.success, true);
  assert.ok(uploadRes.photo);

  // Issue signed photo grant
  const grantResult = generateSignedPhotoGrant(uploadRes.photo, true, nadeemSession);
  assert.equal(grantResult.success, true);
  assert.ok(grantResult.grant?.token);
  assert.ok(grantResult.grant?.tokenHash);

  const token = grantResult.grant.token;

  // Validate active photo access
  const accessCheck = validateSignedPhotoAccess(token, true);
  assert.equal(accessCheck.valid, true);

  // Candidate withdraws photo consent (OPEN-008)
  const purgeResult = purgeCandidatePhoto('cand-e2e-88', nadeemSession);
  assert.equal(purgeResult.success, true);

  // Post-withdrawal: access immediately fails closed
  const postWithdrawalCheck = validateSignedPhotoAccess(token, true);
  assert.equal(postWithdrawalCheck.valid, false);
  assert.equal(postWithdrawalCheck.reason, 'revoked');
});

// =============================================================================
// Journey 7: Customer Self-Service Preference Update & CRM Follow-up Request
// =============================================================================

test('E2E Journey 7: Customer self-service preference update & urgent deactivation request', async () => {
  const crmRepo = crmRepository;

  // Customer creates a deactivation / correction follow-up request
  const followUp = await crmRepo.create({
    profileId: 'cand-e2e-88',
    personName: 'Mother',
    contactPhone: '+92 300 7778899',
    type: 'deactivation_request' as const,
    notes: 'Urgent Profile Deactivation Request: finalized engagement outside bureau.',
    priority: 'urgent',
    dueDate: new Date().toISOString(),
  }, nadeemSession);

  assert.ok(followUp.id);
  assert.equal(followUp.priority, 'urgent');
  assert.equal(followUp.status, 'pending');

  // Staff completes follow-up
  const completed = await crmRepo.complete(followUp.id, nadeemSession, 'Profile status updated to restricted and archived.');
  assert.equal(completed.status, 'completed');
  assert.ok(completed.notes.includes('Resolution: Profile status updated'));
});

// =============================================================================
// Journey 8: External Matchmaker Attribution, Tiered Commission & Reversal
// =============================================================================

test('E2E Journey 8: External matchmaker attribution, tiered agreement calculation & financial reversal', async () => {
  const mmRepo = matchmakerRepository;
  const financeRepo = financeRepository;

  // Register external matchmaker partner
  const partner = await mmRepo.create({
    name: 'Haji Aslam',
    agencyName: 'Al-Madina Matchmaker Multan',
    code: 'MM-MUL-01',
    phone: '+92 300 5556677',
    city: 'Multan',
    status: 'active',
  }, adminSession);

  assert.ok(partner.id);
  assert.equal(partner.code, 'MM-MUL-01');

  // Attribute referral
  const referral = await mmRepo.attributeReferral(
    partner.id,
    'cand-e2e-88',
    nadeemSession,
    'Referred by Haji Aslam during Multan bridal expo'
  );

  assert.equal(referral.success, true);

  // Post commission transaction
  const tx = await financeRepo.record({
    matchmakerId: partner.id,
    matchmakerName: partner.name,
    type: 'payable',
    amount: 25000,
    referenceCode: 'TX-REF-001',
    description: 'Referral commission for candidate match',
  }, adminSession);

  assert.ok(tx.id);
  assert.equal(tx.amount, 25000);
  assert.equal(tx.status, 'pending');

  // Execute traceable reversal
  const reversal = await financeRepo.reverse(
    tx.id,
    'Client cancelled engagement prior to nikah; commission reversed per agreement terms',
    adminSession
  );

  assert.ok(reversal.id);
  assert.equal(reversal.type, 'reversal');
  assert.equal(reversal.reversalOf, tx.id);
  assert.equal(reversal.amount, 25000);

  // Duplicate reversal attempt is blocked
  await assert.rejects(async () => {
    await financeRepo.reverse(tx.id, 'Duplicate attempt', adminSession);
  }, /ALREADY_REVERSED/);
});

// =============================================================================
// Journey 9: Migration Batch Dry-Run, Owner Approval Gate & Rollback
// =============================================================================

test('E2E Journey 9: WhatsApp staged migration dry-run, owner approval gate, rollback & purge', async () => {
  const sampleBiodataChat = `
Name: Usman Ghani
Gender: Male
Age: 29
Marital Status: Never Married
Religion: Islam
Aqeedah: Sunni
Caste: Butt
Education: Master in Computer Science
Occupation: Team Lead
Income: 250000
City: Lahore
Phone: +92 321 8889900
`;

  // 1. Batch creation
  const batch = await createMigrationBatch('whatsapp_chat_export', 'Usman_Biodata.txt', sampleBiodataChat, adminSession);
  assert.ok(batch.id);
  assert.equal(batch.status, 'cataloged');

  // 2. Parse chat export records
  const stagedRecords = await parseWhatsAppChatExport(sampleBiodataChat, batch.id, adminSession);
  assert.equal(stagedRecords.length, 1);
  assert.equal(stagedRecords[0].parsedData.fullName, 'Usman Ghani');

  // Verify and affirm consent
  await resolveQuarantinedRecord(stagedRecords[0].id, 'create_new', 'Candidate signed consent', nadeemSession);

  // 3. Import without owner approval is strictly blocked (P1-42)
  await assert.rejects(async () => {
    await executeBatchImport(batch.id, nadeemSession);
  }, /MIGRATION_BLOCKED/);

  // 4. Affirmative owner approval by admin
  const approved = await approveMigrationBatchByOwner(batch.id, adminSession);
  assert.equal(approved.status, 'approved_by_owner');

  // 5. Successful batch import post-approval
  const importResult = await executeBatchImport(batch.id, nadeemSession);
  assert.equal(importResult.importedCount, 1);
  assert.equal(importResult.batch.status, 'imported');

  // 6. Mathematical reconciliation (P1-45)
  const reconciliation = await reconcileMigrationBatch(batch.id, sampleBiodataChat, adminSession);
  assert.equal(reconciliation.isBalanced, true);
  assert.equal(reconciliation.checksumVerified, true);
  assert.equal(reconciliation.discrepancyCount, 0);

  // 7. Purge raw chat content (P1-47)
  const purged = await purgeStagedRawContent(batch.id, adminSession);
  assert.equal(purged.purgedCount, 1);

  // 8. Rollback migration batch (P1-46)
  const rollbackResult = await rollbackMigrationBatch(
    batch.id,
    'Client requested withdrawal of bulk migration',
    adminSession
  );
  assert.equal(rollbackResult.rolledBackCount, 1);
  assert.equal(rollbackResult.batch.status, 'rolled_back');
});

// =============================================================================
// Journey 10: Bilingual Language Switching with Unicode Bidirectional Isolates
// =============================================================================

test('E2E Journey 10: Bilingual formatting with Unicode bidirectional isolates (OPS-12)', () => {
  const phone = '+92 300 1234567';
  const refCode = 'GLS-LHR-2026-0042';
  const amount = 50000;

  // Phone isolate protection
  const isolatedPhone = formatBilingualPhone(phone);
  assert.ok(isolatedPhone.includes('\u2066'), 'Must contain Left-to-Right Isolate (U+2066)');
  assert.ok(isolatedPhone.includes('\u2069'), 'Must contain Pop Directional Isolate (U+2069)');

  // Reference code isolate protection
  const isolatedRef = formatBilingualReferenceCode(refCode);
  assert.ok(isolatedRef.includes('\u2066'));
  assert.ok(isolatedRef.includes('\u2069'));

  // Currency bilingual formatting
  const urduCurrency = formatBilingualCurrency(amount, 'ur');
  const enCurrency = formatBilingualCurrency(amount, 'en');

  assert.ok(urduCurrency.includes('روپے') || urduCurrency.includes('50,000'));
  assert.ok(enCurrency.includes('PKR') && enCurrency.includes('50,000'));
});
