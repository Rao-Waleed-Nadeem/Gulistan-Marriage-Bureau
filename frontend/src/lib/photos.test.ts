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
  evaluateCandidateRetention,
  executeCandidatePrivacyErasure,
  PhotoRecord,
  DEFAULT_PHOTO_EXPIRY_MS,
} from './photos';
import { computeSha256 } from './crypto';
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

test('generateSignedPhotoGrant computes SHA-256 tokenHash at rest and validates by hash (PRIV-05)', () => {
  resetPhotosForTesting();

  const mockPhoto: PhotoRecord = {
    id: 'pho-103',
    profileId: 'GLS-405',
    storagePath: 'private-photos/GLS-405/test.jpg',
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
  assert.ok(grantRes.grant);

  // Verify token hash is 64 hex characters (SHA-256)
  assert.equal(grantRes.grant.tokenHash.length, 64);
  assert.equal(grantRes.grant.tokenHash, computeSha256(grantRes.grant.token));

  // Access validation succeeds when presented with raw token
  const validByToken = validateSignedPhotoAccess(grantRes.grant.token, true);
  assert.equal(validByToken.valid, true);

  // Access validation succeeds when looked up by tokenHash at rest
  const validByHash = validateSignedPhotoAccess(grantRes.grant.tokenHash, true);
  assert.equal(validByHash.valid, true);

  // Revocation by hash works cleanly
  revokeSignedPhotoGrant(grantRes.grant.tokenHash);
  assert.equal(validateSignedPhotoAccess(grantRes.grant.token, true).valid, false);
});

test('evaluateCandidateRetention enforces 365-day archive limit and immediate consent withdrawal purge (PRIV-07)', () => {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // 1. Photo consent withdrawn: Immediate purge (Day 0)
  const withdrawnPhoto: PhotoRecord = {
    id: 'pho-104',
    profileId: 'GLS-406',
    storagePath: 'private-photos/GLS-406/test.jpg',
    fileName: 'test.jpg',
    fileSizeBytes: 1024,
    mimeType: 'image/jpeg',
    uploadedBy: 'staff',
    uploadedAt: new Date(now).toISOString(),
    consentCertified: false,
    isPurged: true,
  };
  const withdrawnResult = evaluateCandidateRetention({ status: 'active' }, withdrawnPhoto, now);
  assert.equal(withdrawnResult.actionRequired, 'purge');
  assert.equal(withdrawnResult.isEligibleForPurge, true);

  // 2. Active profile: Retain
  const activeResult = evaluateCandidateRetention({ status: 'active' }, null, now);
  assert.equal(activeResult.actionRequired, 'none');
  assert.equal(activeResult.isEligibleForPurge, false);

  // 3. Inactive profile under 365 days (e.g. 100 days): Archive
  const inactive100Days = evaluateCandidateRetention(
    { status: 'inactive', updatedAt: new Date(now - 100 * dayMs).toISOString() },
    null,
    now
  );
  assert.equal(inactive100Days.actionRequired, 'archive');
  assert.equal(inactive100Days.isEligibleForPurge, false);
  assert.equal(inactive100Days.daysInactive, 100);

  // 4. Inactive profile over 365 days (e.g. 400 days): Due for purge
  const inactive400Days = evaluateCandidateRetention(
    { status: 'inactive', updatedAt: new Date(now - 400 * dayMs).toISOString() },
    null,
    now
  );
  assert.equal(inactive400Days.actionRequired, 'purge');
  assert.equal(inactive400Days.isEligibleForPurge, true);
  assert.equal(inactive400Days.daysInactive, 400);
});

test('executeCandidatePrivacyErasure purges photo and revokes active grants (PRIV-08)', () => {
  resetPhotosForTesting();

  const file = { name: 'portrait.jpg', size: 1024 * 1024, type: 'image/jpeg' };
  const upload = uploadPrivatePhoto('GLS-407', file, true, staffSession);
  assert.equal(upload.success, true);

  const grant1 = generateSignedPhotoGrant(upload.photo!, true, staffSession);
  assert.equal(grant1.success, true);

  // Execute erasure request
  const erasure = executeCandidatePrivacyErasure('GLS-407', staffSession);
  assert.equal(erasure.success, true);
  assert.ok(erasure.grantsRevokedCount >= 1);

  // Grant must now be revoked
  const check = validateSignedPhotoAccess(grant1.grant!.token, true);
  assert.equal(check.valid, false);
  assert.equal(check.reason, 'revoked');
});
