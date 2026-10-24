import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validatePhotoFile,
  generateIsolatedStoragePath,
  uploadPrivatePhoto,
  generateSignedPhotoGrant,
  validateSignedPhotoAccess,
  revokeSignedPhotoGrant,
  purgeCandidatePhoto,
  sanitizePhotoAuditPayload,
  resetPhotosForTesting,
  PhotoRecord,
  DEFAULT_PHOTO_EXPIRY_MS,
} from './photos';
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
  token: 'mock-staff-token',
  expiresAt: Date.now() + 3600000,
  isAuthenticated: true,
};

const customerSession: AuthSession = {
  user: {
    id: 'usr-customer-1',
    email: 'fatima@example.com',
    displayName: 'Fatima Candidate',
    role: 'customer',
    preferredLanguage: 'ur',
  },
  role: 'customer',
  token: 'mock-customer-token',
  expiresAt: Date.now() + 3600000,
  isAuthenticated: true,
};

test('validatePhotoFile enforces 5 MB limit and permitted MIME types', () => {
  // Valid JPG
  const validJpg = validatePhotoFile({ name: 'candidate.jpg', size: 1024 * 1024, type: 'image/jpeg' });
  assert.equal(validJpg.valid, true);

  // Valid PNG
  const validPng = validatePhotoFile({ name: 'candidate.png', size: 2 * 1024 * 1024, type: 'image/png' });
  assert.equal(validPng.valid, true);

  // File too large (> 5 MB)
  const tooLarge = validatePhotoFile({ name: 'huge.jpg', size: 6 * 1024 * 1024, type: 'image/jpeg' });
  assert.equal(tooLarge.valid, false);
  assert.equal(tooLarge.error?.code, 'FILE_TOO_LARGE');
  assert.ok(tooLarge.error?.messageEn.includes('5 MB'));
  assert.ok(tooLarge.error?.messageUrdu.length! > 0);

  // Disallowed MIME type (PDF)
  const badMime = validatePhotoFile({ name: 'doc.pdf', size: 500 * 1024, type: 'application/pdf' });
  assert.equal(badMime.valid, false);
  assert.equal(badMime.error?.code, 'INVALID_FILE_TYPE');
});

test('generateIsolatedStoragePath conceals personal identity and uses private bucket prefix', () => {
  const path = generateIsolatedStoragePath('GLS-401', 'jpg');
  assert.ok(path.startsWith('private-photos/GLS-401/'));
  assert.ok(path.endsWith('.jpg'));
  assert.ok(!path.includes('Fatima'), 'Must never contain personal legal name');
  assert.ok(!path.includes('+92'), 'Must never contain phone numbers');
});

test('uploadPrivatePhoto enforces authorization and consent certification', () => {
  resetPhotosForTesting();

  const file = { name: 'portrait.jpg', size: 1.5 * 1024 * 1024, type: 'image/jpeg' };

  // Fails if unauthenticated
  const unauth = uploadPrivatePhoto('GLS-401', file, true, null);
  assert.equal(unauth.success, false);
  assert.equal(unauth.error?.code, 'UNAUTHORIZED');

  // Fails if consent certification is false (OPEN-004)
  const noConsent = uploadPrivatePhoto('GLS-401', file, false, staffSession);
  assert.equal(noConsent.success, false);
  assert.equal(noConsent.error?.code, 'CONSENT_CERTIFICATION_REQUIRED');

  // Succeeds when uploaded by staff with certified consent
  const success = uploadPrivatePhoto('GLS-401', file, true, staffSession);
  assert.equal(success.success, true);
  assert.ok(success.photo);
  assert.equal(success.photo?.profileId, 'GLS-401');
  assert.equal(success.photo?.isPurged, false);
});

test('generateSignedPhotoGrant enforces 48-hour expiration and consent gating', () => {
  resetPhotosForTesting();

  const mockPhoto: PhotoRecord = {
    id: 'pho-101',
    profileId: 'GLS-401',
    storagePath: 'private-photos/GLS-401/test.jpg',
    fileName: 'test.jpg',
    fileSizeBytes: 1024 * 1024,
    mimeType: 'image/jpeg',
    uploadedBy: 'nadeem@gulistan.pk',
    uploadedAt: new Date().toISOString(),
    consentCertified: true,
    isPurged: false,
  };

  // Rejects if candidate photo permission is withheld
  const withheld = generateSignedPhotoGrant(mockPhoto, false, staffSession);
  assert.equal(withheld.success, false);
  assert.equal(withheld.error?.code, 'CONSENT_REQUIRED');

  // Rejects if caller is customer (only staff can issue sharing grants)
  const unauthRole = generateSignedPhotoGrant(mockPhoto, true, customerSession);
  assert.equal(unauthRole.success, false);
  assert.equal(unauthRole.error?.code, 'UNAUTHORIZED');

  // Succeeds for staff with 48-hour expiration
  const grantRes = generateSignedPhotoGrant(mockPhoto, true, staffSession, 'Proposal to Khan Family');
  assert.equal(grantRes.success, true);
  assert.ok(grantRes.grant);
  assert.ok(grantRes.grant?.signedUrl.includes('token='));
  
  // Verify 48-hour duration (~172,800,000 ms)
  const durationMs = grantRes.grant!.expiresAt - grantRes.grant!.issuedAt;
  assert.equal(durationMs, DEFAULT_PHOTO_EXPIRY_MS);
});

test('validateSignedPhotoAccess fails closed on expired, revoked, or consent-withdrawn tokens', () => {
  resetPhotosForTesting();

  const mockPhoto: PhotoRecord = {
    id: 'pho-102',
    profileId: 'GLS-402',
    storagePath: 'private-photos/GLS-402/test.jpg',
    fileName: 'test.jpg',
    fileSizeBytes: 1024 * 1024,
    mimeType: 'image/jpeg',
    uploadedBy: 'nadeem@gulistan.pk',
    uploadedAt: new Date().toISOString(),
    consentCertified: true,
    isPurged: false,
  };

  const grantRes = generateSignedPhotoGrant(mockPhoto, true, staffSession);
  assert.equal(grantRes.success, true);
  const token = grantRes.grant!.token;

  // 1. Active token with valid consent passes
  const validAccess = validateSignedPhotoAccess(token, true);
  assert.equal(validAccess.valid, true);

  // 2. Revoked token fails closed
  revokeSignedPhotoGrant(token);
  const revokedAccess = validateSignedPhotoAccess(token, true);
  assert.equal(revokedAccess.valid, false);
  assert.equal(revokedAccess.reason, 'revoked');

  // 3. New token with withdrawn consent fails closed
  const grantRes2 = generateSignedPhotoGrant(mockPhoto, true, staffSession);
  const token2 = grantRes2.grant!.token;
  const consentWithdrawn = validateSignedPhotoAccess(token2, false);
  assert.equal(consentWithdrawn.valid, false);
  assert.equal(consentWithdrawn.reason, 'consent_withdrawn');
});

test('purgeCandidatePhoto immediately removes photo and revokes active grants (OPEN-008)', () => {
  resetPhotosForTesting();

  const file = { name: 'portrait.jpg', size: 1024 * 1024, type: 'image/jpeg' };
  const uploaded = uploadPrivatePhoto('GLS-403', file, true, staffSession);
  assert.equal(uploaded.success, true);

  const grant = generateSignedPhotoGrant(uploaded.photo!, true, staffSession);
  assert.equal(grant.success, true);
  const token = grant.grant!.token;

  // Verify access is initially valid
  assert.equal(validateSignedPhotoAccess(token, true).valid, true);

  // Purge photo
  const purgeRes = purgeCandidatePhoto('GLS-403', staffSession);
  assert.equal(purgeRes.success, true);

  // Post-purge: Token access must fail closed
  const postPurgeAccess = validateSignedPhotoAccess(token, true);
  assert.equal(postPurgeAccess.valid, false);
  assert.equal(postPurgeAccess.reason, 'revoked');
});

test('sanitizePhotoAuditPayload strictly strips photo URLs and bearer tokens', () => {
  const dirtyAudit = {
    action: 'PHOTO_SHARED',
    actorId: 'usr-nadeem',
    profileId: 'GLS-401',
    token: 'sig_secret_token_123',
    signedUrl: 'https://gulistan.pk/secure-photo?token=sig_secret_token_123',
    rawToken: 'raw_bearer_secret',
    secret: 'client_secret',
  };

  const safe = sanitizePhotoAuditPayload(dirtyAudit);
  assert.equal(safe.token, undefined);
  assert.equal(safe.signedUrl, undefined);
  assert.equal(safe.rawToken, undefined);
  assert.equal(safe.secret, undefined);
  assert.equal(safe.action, 'PHOTO_SHARED');
  assert.equal(safe.profileId, 'GLS-401');
});
