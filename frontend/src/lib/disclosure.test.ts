import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  authorizeDisclosure,
  generateAuthorizedWhatsAppDraft,
  createDisclosureAuditRecord,
  validateShareGrant,
  sanitizeCustomNote,
  DEFAULT_SHARE_GRANT_EXPIRY_MS,
  BUREAU_OFFICE_PHONE,
  DisclosureRequestOptions,
} from './disclosure';
import { ProfileRecord } from '../types';
import { AuthSession } from './auth';

function createTestProfile(overrides: Partial<ProfileRecord>): ProfileRecord {
  const base: ProfileRecord = {
    id: 'GLS-D01',
    fullName: 'Dr. Fatima Tariq',
    displayName: 'Dr. Fatima (Physician)',
    gender: 'female',
    age: 26,
    height: "5'4\"",
    maritalStatus: 'never_married',
    religion: 'Islam',
    aqeedah: 'Sunni / Hanafi',
    caste: 'Sheikh',
    education: 'MBBS (King Edward)',
    educationField: 'Medicine',
    occupation: 'Resident Doctor',
    jobTitle: 'Medical Officer',
    monthlyIncomePKR: 240000,
    hometown: 'Lahore',
    currentCity: 'Lahore',
    residenceArea: 'DHA Phase 5',
    photoUrl: 'https://storage.internal/private-photos/GLS-D01.jpg',
    photoPermissionGranted: true,
    fatherStatus: 'alive',
    motherStatus: 'alive',
    siblings: [],
    familyBackgroundNotes: 'Educated Punjabi Sheikh family settled in Lahore.',
    property: {
      ownership: 'owned',
      propertyType: 'house',
      areaMarlas: 20,
      city: 'Lahore',
      locality: 'DHA Phase 5',
      householdArrangement: 'independent',
    },
    preferences: {
      ageMin: 27,
      ageMax: 32,
      heightMin: "5'8\"",
      maritalStatus: ['never_married'],
      religion: 'Islam',
      aqeedah: 'Sunni / Hanafi',
      caste: 'Sheikh',
      educationMin: 'Bachelors',
      preferredOccupations: [],
      cityPreferences: ['Lahore'],
      propertyExpectation: 'None',
      familyArrangement: 'any',
      criteriaClassifications: {},
    },
    status: 'active',
    source: 'walk_in',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    contactPerson: 'Tariq Mehmood (Father)',
    contactPhone: '+92 300 1234567',
    contactEmail: 'father@example.com',
    preferredContactMethod: 'whatsapp',
  };
  return { ...base, ...overrides };
}

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

test('authorizeDisclosure fails closed for unauthenticated or unauthorized users', () => {
  const profile = createTestProfile({ status: 'active' });

  // 1. Unauthenticated session
  const noAuthResult = authorizeDisclosure(profile, { includeAge: true }, null);
  assert.equal(noAuthResult.success, false);
  assert.equal(noAuthResult.error?.code, 'UNAUTHORIZED');

  // 2. Customer role trying to generate staff sharing drafts
  const customerResult = authorizeDisclosure(profile, { includeAge: true }, customerSession);
  assert.equal(customerResult.success, false);
  assert.equal(customerResult.error?.code, 'UNAUTHORIZED');
});

test('authorizeDisclosure denies sharing unapproved or restricted profiles', () => {
  // Pending review
  const pendingProfile = createTestProfile({ status: 'pending_review' });
  const pendingResult = authorizeDisclosure(pendingProfile, { includeAge: true }, staffSession);
  assert.equal(pendingResult.success, false);
  assert.equal(pendingResult.error?.code, 'PROFILE_PENDING_REVIEW');

  // Restricted
  const restrictedProfile = createTestProfile({ status: 'restricted' });
  const restrictedResult = authorizeDisclosure(restrictedProfile, { includeAge: true }, staffSession);
  assert.equal(restrictedResult.success, false);
  assert.equal(restrictedResult.error?.code, 'PROFILE_NOT_SHAREABLE');
});

test('authorizeDisclosure protects legal name and contact details for active profiles (OPEN-005)', () => {
  // Profile in 'active' status (pre-introduction)
  const activeProfile = createTestProfile({
    status: 'active',
    fullName: 'Dr. Fatima Tariq',
    displayName: 'Dr. Fatima (Physician)',
    contactPhone: '+92 300 1234567',
  });

  const requested: DisclosureRequestOptions = {
    includeName: true,
    includeContactNumber: true,
    includeAge: true,
  };

  const result = authorizeDisclosure(activeProfile, requested, staffSession);
  assert.equal(result.success, true);
  assert.ok(result.snapshot);

  const snapshot = result.snapshot;
  // Legal name should NOT be disclosed; pseudonym/display name is used
  assert.equal(snapshot.disclosedData.isLegalNameDisclosed, false);
  assert.equal(snapshot.disclosedData.name, 'Dr. Fatima (Physician)');
  assert.ok(snapshot.withheldReasons.some((r) => r.code === 'LEGAL_NAME_LOCKED_PENDING_INTRODUCTION'));

  // Direct candidate phone number should NOT be disclosed; bureau office concierge is provided
  assert.equal(snapshot.disclosedData.isDirectContactDisclosed, false);
  assert.ok(snapshot.disclosedData.contactNumber?.includes(BUREAU_OFFICE_PHONE));
  assert.ok(!snapshot.disclosedData.contactNumber?.includes('+92 300 1234567'));
  assert.ok(snapshot.withheldReasons.some((r) => r.code === 'DIRECT_CONTACT_LOCKED_PENDING_INTRODUCTION'));
});

test('authorizeDisclosure unlocks full legal name and direct contact for introduction_authorized profiles (OPEN-005)', () => {
  // Profile in 'introduction_authorized' status
  const introProfile = createTestProfile({
    status: 'introduction_authorized',
    fullName: 'Dr. Fatima Tariq',
    contactPhone: '+92 300 1234567',
  });

  const requested: DisclosureRequestOptions = {
    includeName: true,
    includeContactNumber: true,
  };

  const result = authorizeDisclosure(introProfile, requested, staffSession);
  assert.equal(result.success, true);
  assert.ok(result.snapshot);

  const snapshot = result.snapshot;
  // Full legal name is unlocked
  assert.equal(snapshot.disclosedData.isLegalNameDisclosed, true);
  assert.equal(snapshot.disclosedData.name, 'Dr. Fatima Tariq');

  // Direct contact is unlocked
  assert.equal(snapshot.disclosedData.isDirectContactDisclosed, true);
  assert.equal(snapshot.disclosedData.contactNumber, '+92 300 1234567');
  assert.equal(snapshot.withheldReasons.length, 0);
});

test('authorizeDisclosure prevents client payload injection of unauthorized or fabricated fields', () => {
  const profile = createTestProfile({
    status: 'active',
    occupation: 'Doctor / Medical Officer',
    monthlyIncomePKR: 240000,
  });

  const maliciousOptions = {
    includeOccupation: true,
    // Attacker attempts to inject fabricated values and non-existent private fields
    injectedSalary: '₨ 5,000,000 / month',
    adminNotes: 'Internal confidential rating A+',
    hackedField: '<script>alert(1)</script>',
  };

  const result = authorizeDisclosure(profile, maliciousOptions, staffSession);
  assert.equal(result.success, true);
  assert.ok(result.snapshot);

  const data = result.snapshot.disclosedData;
  // Legitimate field read from verified DB
  assert.equal(data.occupation, 'Doctor / Medical Officer');

  // Injected fields must not exist anywhere in the authorized snapshot
  assert.equal((data as unknown as Record<string, unknown>)['injectedSalary'], undefined);
  assert.equal((data as unknown as Record<string, unknown>)['adminNotes'], undefined);
  assert.equal((data as unknown as Record<string, unknown>)['hackedField'], undefined);
});

test('authorizeDisclosure respects photo permission consent gating (OPEN-006)', () => {
  const mockSignedUrl = 'https://storage.supabase.co/private-photos/signed-token-123';

  // 1. Photo consent granted
  const consentProfile = createTestProfile({ photoPermissionGranted: true });
  const allowed = authorizeDisclosure(consentProfile, { includePhotoLink: true }, staffSession, mockSignedUrl);
  assert.equal(allowed.success, true);
  assert.equal(allowed.snapshot?.disclosedData.photoGrantUrl, mockSignedUrl);
  assert.ok(allowed.snapshot?.authorizedFields.includes('photo_link'));

  // 2. Photo consent denied / withdrawn
  const noConsentProfile = createTestProfile({ photoPermissionGranted: false });
  const denied = authorizeDisclosure(noConsentProfile, { includePhotoLink: true }, staffSession, mockSignedUrl);
  assert.equal(denied.success, true);
  assert.equal(denied.snapshot?.disclosedData.photoGrantUrl, undefined);
  assert.ok(denied.snapshot?.withheldReasons.some((r) => r.code === 'PHOTO_CONSENT_DENIED'));
});

test('generateAuthorizedWhatsAppDraft produces polite, cultural Urdu and English drafts', () => {
  const profile = createTestProfile({
    id: 'GLS-D02',
    status: 'active',
    age: 26,
    education: 'MBBS (King Edward)',
    currentCity: 'Lahore',
    residenceArea: 'DHA Phase 5',
    caste: 'Sheikh',
    aqeedah: 'Sunni / Hanafi',
  });

  const result = authorizeDisclosure(
    profile,
    {
      includeRefNumber: true,
      includeAge: true,
      includeEducation: true,
      includeCity: true,
      includeCaste: true,
      includeSect: true,
      customNote: 'Recommended by Nadeem Ahmed for family review.',
    },
    staffSession
  );
  assert.ok(result.snapshot);

  // Urdu draft
  const urduDraft = generateAuthorizedWhatsAppDraft(result.snapshot, 'ur');
  assert.ok(urduDraft.messageText.includes('السلام علیکم ورحمۃ اللہ'));
  assert.ok(urduDraft.messageText.includes('*ریفرنس نمبر:* GLS-D02'));
  assert.ok(urduDraft.messageText.includes('*عمر:* 26 سال'));
  assert.ok(urduDraft.messageText.includes('MBBS (King Edward)'));
  assert.ok(urduDraft.messageText.includes('Lahore (DHA Phase 5)'));
  assert.ok(urduDraft.messageText.includes('گلستان میرج بیورو'));
  assert.ok(urduDraft.deepLinkUrl.startsWith('https://wa.me/?text='));

  // English draft
  const enDraft = generateAuthorizedWhatsAppDraft(result.snapshot, 'en');
  assert.ok(enDraft.messageText.includes('Assalamu Alaikum'));
  assert.ok(enDraft.messageText.includes('*Reference ID:* GLS-D02'));
  assert.ok(enDraft.messageText.includes('*Age:* 26 Years'));
  assert.ok(enDraft.messageText.includes('Gulistan Marriage Bureau'));
  assert.ok(enDraft.deepLinkUrl.startsWith('https://wa.me/?text='));
});

test('createDisclosureAuditRecord strictly minimizes sensitive data and omits private content', () => {
  const profile = createTestProfile({
    status: 'active',
    fullName: 'Dr. Fatima Tariq',
    contactPhone: '+92 300 1234567',
  });

  const result = authorizeDisclosure(profile, { includeName: true, includeContactNumber: true }, staffSession);
  assert.ok(result.snapshot);

  const auditRecord = createDisclosureAuditRecord(result.snapshot, staffSession);
  assert.equal(auditRecord.target_id, 'GLS-D01');
  assert.equal(auditRecord.action, 'proposal_share_draft_generated');
  assert.equal(auditRecord.actor_role, 'nadeem');

  // Verify details string does NOT leak phone number, full legal name, photo URL, or full message body
  const details = auditRecord.details;
  assert.ok(!details.includes('+92 300 1234567'), 'Audit details must NOT contain contact phone numbers');
  assert.ok(!details.includes('Dr. Fatima Tariq'), 'Audit details must NOT contain full candidate names');
  assert.ok(!details.includes('السلام علیکم'), 'Audit details must NOT contain proposal message bodies');

  // Details should contain non-sensitive telemetry only
  const parsed = JSON.parse(details);
  assert.ok(parsed.grantId);
  assert.ok(Array.isArray(parsed.authorizedFields));
  assert.equal(typeof parsed.withheldCount, 'number');
});

test('validateShareGrant validates expiration and instant revocation (OPEN-006)', () => {
  const now = Date.now();

  // Active unexpired grant
  const activeGrant = {
    expiresAtMs: now + DEFAULT_SHARE_GRANT_EXPIRY_MS,
    isRevoked: false,
  };
  assert.equal(validateShareGrant(activeGrant).valid, true);

  // Expired grant (past 48 hours)
  const expiredGrant = {
    expiresAtMs: now - 1000,
    isRevoked: false,
  };
  const expCheck = validateShareGrant(expiredGrant);
  assert.equal(expCheck.valid, false);
  assert.equal(expCheck.reason, 'expired');

  // Revoked grant
  const revokedGrant = {
    expiresAtMs: now + DEFAULT_SHARE_GRANT_EXPIRY_MS,
    isRevoked: true,
  };
  const revCheck = validateShareGrant(revokedGrant);
  assert.equal(revCheck.valid, false);
  assert.equal(revCheck.reason, 'revoked');
});

test('sanitizeCustomNote sanitizes HTML tags, script attempts, and truncates length', () => {
  assert.equal(sanitizeCustomNote(undefined), undefined);
  assert.equal(sanitizeCustomNote(''), undefined);

  // Script injection strip
  const injection = '<script>alert("hack")</script>Please review with family.';
  const sanitized = sanitizeCustomNote(injection);
  assert.ok(!sanitized?.includes('<script>'));
  assert.ok(!sanitized?.includes('</script>'));
  assert.ok(sanitized?.includes('Please review with family.'));

  // Length truncation
  const longNote = 'A'.repeat(500);
  const truncated = sanitizeCustomNote(longNote);
  assert.equal(truncated?.length, 300);
});
