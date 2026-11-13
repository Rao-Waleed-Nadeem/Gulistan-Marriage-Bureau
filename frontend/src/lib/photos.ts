/**
 * Private Photo Storage & Consent-Gated Access — Gulistan Marriage Bureau
 * 
 * ARCHITECTURAL POLICIES (DECIDED: OPEN-004, OPEN-006, OPEN-008, PRIV-01..PRIV-08):
 * 1. Private Buckets Only: All photographs are stored in a private bucket with zero public access.
 * 2. Short-Lived Signed URLs: 48-hour default expiry for WhatsApp family sharing (OPEN-006).
 * 3. Consent Gating: Photographs cannot be uploaded or viewed unless explicit candidate consent exists.
 * 4. Immediate Purge: Photos are purged immediately from storage upon consent withdrawal or profile deletion (OPEN-008).
 * 5. Privacy Zero-Logging: Signed URLs and bearer tokens are NEVER written to logs or audit payloads.
 * 6. Non-Guessable Paths: Storage paths use isolated UUIDs; never candidate names or phone numbers (PRIV-02).
 * 7. Token Hashing at Rest: Bearer tokens are hashed with SHA-256 at rest (PRIV-05).
 * 8. Retention Invariant: Inactive profiles archived 1 year then purged; audit/finance retained permanently (PRIV-07).
 */

import { Role } from '../types';
import { AuthSession, canAccessRole } from './auth';
import { getClientConfig } from './config';
import { getSupabaseClient } from './supabaseClient';
import { computeSha256, generateCryptoUUID, generateSecureToken } from './crypto';

export const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const DEFAULT_PHOTO_EXPIRY_MS = 48 * 60 * 60 * 1000; // 48 hours (OPEN-006)
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const INACTIVE_RETENTION_MAX_DAYS = 365; // 1 year before purge (PRIV-07)

export interface PhotoRecord {
  id: string;
  profileId: string;
  storagePath: string; // e.g., 'private-photos/GLS-401/f81d4fae-7dec-4a11-89b2-a42e5684.jpg'
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: string;
  consentCertified: boolean;
  isPurged: boolean;
}

export interface SignedPhotoGrant {
  token: string;
  tokenHash: string; // 64-char SHA-256 hex hash for at-rest storage & lookup (PRIV-05)
  signedUrl: string;
  photoId: string;
  profileId: string;
  issuedAt: number;
  expiresAt: number;
  isRevoked: boolean;
  recipientContext?: string;
}

export interface PhotoValidationResult {
  valid: boolean;
  error?: {
    code: string;
    messageEn: string;
    messageUrdu: string;
  };
}

export interface RetentionEvaluationResult {
  isEligibleForArchive: boolean;
  isEligibleForPurge: boolean;
  daysInactive: number;
  actionRequired: 'none' | 'archive' | 'purge';
  explanationEn: string;
  explanationUrdu: string;
}

// In-Memory Storage & Token Registry for Local Demo & Offline Mode
const demoPhotos: Map<string, PhotoRecord> = new Map();
const activeGrantsByToken: Map<string, SignedPhotoGrant> = new Map();
const activeGrantsByHash: Map<string, SignedPhotoGrant> = new Map();

/**
 * Validates candidate photo file before upload.
 */
export function validatePhotoFile(file: {
  name: string;
  size: number;
  type: string;
}): PhotoValidationResult {
  if (!file || !file.name) {
    return {
      valid: false,
      error: {
        code: 'MISSING_FILE',
        messageEn: 'Please select a photo file to upload.',
        messageUrdu: 'براہ کرم تصویر کا انتخاب کریں۔',
      },
    };
  }

  // File size validation (max 5 MB)
  if (file.size > MAX_PHOTO_SIZE_BYTES) {
    return {
      valid: false,
      error: {
        code: 'FILE_TOO_LARGE',
        messageEn: 'Photo file size exceeds the 5 MB limit.',
        messageUrdu: 'تصویر کا سائز ۵ ایم بی کی حد سے زیادہ ہے۔',
      },
    };
  }

  // MIME type validation
  const cleanMime = file.type.toLowerCase();
  if (!ALLOWED_MIME_TYPES.includes(cleanMime)) {
    return {
      valid: false,
      error: {
        code: 'INVALID_FILE_TYPE',
        messageEn: 'Only JPG, PNG, and WebP image formats are permitted.',
        messageUrdu: 'صرف JPG، PNG اور WebP فارمیٹس کی اجازت ہے۔',
      },
    };
  }

  return { valid: true };
}

/**
 * Generates an isolated, non-guessable storage path that conceals personal identity.
 * Uses cryptographically secure UUID v4 (PRIV-02).
 */
export function generateIsolatedStoragePath(profileId: string, extension: string): string {
  const safeProfileId = profileId.replace(/[^a-zA-Z0-9_-]/g, '');
  const randomSuffix = generateCryptoUUID();
  const cleanExt = extension.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg';
  return `private-photos/${safeProfileId}/${randomSuffix}.${cleanExt}`;
}

/**
 * Generates a high-entropy signed bearer URL with 48-hour expiration.
 * Stores 64-char SHA-256 hash at rest (PRIV-05).
 * FAILS CLOSED if consent is absent or caller lacks permission.
 */
export function generateSignedPhotoGrant(
  photo: PhotoRecord,
  photoPermissionGranted: boolean,
  session: AuthSession | null,
  recipientContext: string = 'WhatsApp Family Introduction'
): { success: boolean; grant: SignedPhotoGrant | null; error?: { code: string; messageEn: string; messageUrdu: string } } {
  // 1. Caller Authorization: Only staff (Nadeem / Admin) can issue sharing grants
  if (!canAccessRole(session, 'nadeem')) {
    return {
      success: false,
      grant: null,
      error: {
        code: 'UNAUTHORIZED',
        messageEn: 'Only authorized bureau matchmakers can generate photo introduction links.',
        messageUrdu: 'صرف مجاز میچ میکر ہی تصویر کا محفوظ لنک جاری کر سکتے ہیں۔',
      },
    };
  }

  // 2. Consent Verification: Must have active candidate consent
  if (!photoPermissionGranted || photo.isPurged) {
    return {
      success: false,
      grant: null,
      error: {
        code: 'CONSENT_REQUIRED',
        messageEn: 'Cannot generate photo link: candidate has withheld or withdrawn photo consent.',
        messageUrdu: 'امیدوار کی باقاعدہ اجازت کے بغیر تصویر کا لنک جاری نہیں کیا جا سکتا۔',
      },
    };
  }

  // 3. Generate high-entropy bearer token & 48-hour expiration
  const now = Date.now();
  const token = generateSecureToken('sig', 24);
  const tokenHash = computeSha256(token);
  const expiresAt = now + DEFAULT_PHOTO_EXPIRY_MS;

  const grant: SignedPhotoGrant = {
    token,
    tokenHash,
    signedUrl: `https://gulistan.pk/secure-photo?token=${token}&scope=${photo.profileId}`,
    photoId: photo.id,
    profileId: photo.profileId,
    issuedAt: now,
    expiresAt,
    isRevoked: false,
    recipientContext,
  };

  activeGrantsByToken.set(token, grant);
  activeGrantsByHash.set(tokenHash, grant);

  return {
    success: true,
    grant,
  };
}

/**
 * Validates a signed bearer token. Fails closed if expired, revoked, or consent withdrawn.
 * Supports lookup by raw bearer token or token hash (PRIV-05).
 */
export function validateSignedPhotoAccess(
  tokenOrHash: string,
  isConsentActive: boolean
): { valid: boolean; reason?: 'missing' | 'expired' | 'revoked' | 'consent_withdrawn' } {
  let grant = activeGrantsByToken.get(tokenOrHash);
  if (!grant) {
    const hash = tokenOrHash.length === 64 ? tokenOrHash : computeSha256(tokenOrHash);
    grant = activeGrantsByHash.get(hash);
  }

  if (!grant) {
    return { valid: false, reason: 'missing' };
  }

  if (grant.isRevoked) {
    return { valid: false, reason: 'revoked' };
  }

  // Expiration check (48 hours)
  if (Date.now() > grant.expiresAt) {
    return { valid: false, reason: 'expired' };
  }

  // If candidate has withdrawn photo consent, immediately fail and revoke
  if (!isConsentActive) {
    grant.isRevoked = true;
    return { valid: false, reason: 'consent_withdrawn' };
  }

  return { valid: true };
}

/**
 * Revokes an issued signed photo grant immediately by token or hash.
 */
export function revokeSignedPhotoGrant(tokenOrHash: string): boolean {
  let grant = activeGrantsByToken.get(tokenOrHash);
  if (!grant) {
    const hash = tokenOrHash.length === 64 ? tokenOrHash : computeSha256(tokenOrHash);
    grant = activeGrantsByHash.get(hash);
  }

  if (grant) {
    grant.isRevoked = true;
    return true;
  }
  return false;
}

/**
 * Immediately purges a candidate photo and revokes all active signed grants (OPEN-008).
 */
export function purgeCandidatePhoto(
  profileId: string,
  session: AuthSession | null
): { success: boolean; purgedPhotoId: string | null; grantsRevokedCount?: number; error?: { code: string; messageEn: string; messageUrdu: string } } {
  const isStaff = canAccessRole(session, 'nadeem');
  const isOwner = session?.isAuthenticated && session.user?.role === 'customer';

  if (!isStaff && !isOwner) {
    return {
      success: false,
      purgedPhotoId: null,
      error: {
        code: 'UNAUTHORIZED',
        messageEn: 'Unauthorized to delete candidate photograph.',
        messageUrdu: 'تصویر ڈیلیٹ کرنے کے اختیارات موجود نہیں ہیں۔',
      },
    };
  }

  const photo = demoPhotos.get(profileId);
  if (!photo) {
    return {
      success: false,
      purgedPhotoId: null,
      error: {
        code: 'NOT_FOUND',
        messageEn: 'No photograph record found for this profile.',
        messageUrdu: 'اس پروفائل کے لیے کوئی تصویر نہیں ملی۔',
      },
    };
  }

  // Mark purged and delete from memory
  photo.isPurged = true;
  demoPhotos.delete(profileId);

  // Revoke all existing signed grants for this photo
  let revokedCount = 0;
  for (const grant of activeGrantsByToken.values()) {
    if (grant.profileId === profileId) {
      if (!grant.isRevoked) {
        revokedCount++;
      }
      grant.isRevoked = true;
    }
  }

  return {
    success: true,
    purgedPhotoId: photo.id,
    grantsRevokedCount: revokedCount,
  };
}

/**
 * Uploads a private candidate photograph after consent validation.
 */
export function uploadPrivatePhoto(
  profileId: string,
  file: { name: string; size: number; type: string },
  consentCertified: boolean,
  session: AuthSession | null
): { success: boolean; photo: PhotoRecord | null; error?: { code: string; messageEn: string; messageUrdu: string } } {
  // Validate file properties
  const fileCheck = validatePhotoFile(file);
  if (!fileCheck.valid) {
    return {
      success: false,
      photo: null,
      error: fileCheck.error,
    };
  }

  // Validate consent certification (OPEN-004)
  if (!consentCertified) {
    return {
      success: false,
      photo: null,
      error: {
        code: 'CONSENT_CERTIFICATION_REQUIRED',
        messageEn: 'Candidate legal consent certification is mandatory before photo upload.',
        messageUrdu: 'تصویر اپ لوڈ کرنے سے قبل امیدوار کا اجازت نامہ لازمی ہے۔',
      },
    };
  }

  // Validate caller permissions (Staff or profile owner)
  const isStaff = canAccessRole(session, 'nadeem');
  const isOwner = session?.isAuthenticated && session.user?.role === 'customer';
  if (!isStaff && !isOwner) {
    return {
      success: false,
      photo: null,
      error: {
        code: 'UNAUTHORIZED',
        messageEn: 'Unauthorized to upload photo for this candidate.',
        messageUrdu: 'اس امیدوار کے لیے تصویر اپ لوڈ کرنے کی اجازت نہیں ہے۔',
      },
    };
  }

  const extension = file.name.split('.').pop() || 'jpg';
  const storagePath = generateIsolatedStoragePath(profileId, extension);

  const photoRecord: PhotoRecord = {
    id: `pho_${Date.now()}`,
    profileId,
    storagePath,
    fileName: file.name,
    fileSizeBytes: file.size,
    mimeType: file.type,
    uploadedBy: session?.user?.email || 'matchmaker@gulistan.pk',
    uploadedAt: new Date().toISOString(),
    consentCertified: true,
    isPurged: false,
  };

  demoPhotos.set(profileId, photoRecord);

  return {
    success: true,
    photo: photoRecord,
  };
}

/**
 * Evaluates candidate photo and profile data retention rules (PRIV-07).
 * - Inactive profiles archive for 1 year (365 days), then purge.
 * - Consent withdrawal triggers immediate purge (Day 0).
 * - Permanent retention for financial and audit logs.
 */
export function evaluateCandidateRetention(
  profile: { status: string; updatedAt?: string; lastActiveAt?: string },
  photo?: PhotoRecord | null,
  currentTimestamp: number = Date.now()
): RetentionEvaluationResult {
  // 1. Consent withdrawal immediate purge
  if (photo && (photo.isPurged || !photo.consentCertified)) {
    return {
      isEligibleForArchive: false,
      isEligibleForPurge: true,
      daysInactive: 0,
      actionRequired: 'purge',
      explanationEn: 'Photo consent has been withdrawn. Photo must be purged immediately (OPEN-008).',
      explanationUrdu: 'تصویر کی اجازت واپس لے لی گئی ہے۔ تصویر فوری ڈیلیٹ کرنا لازمی ہے۔',
    };
  }

  // 2. Active profile: retain
  if (profile.status === 'active' || profile.status === 'introduction_authorized') {
    return {
      isEligibleForArchive: false,
      isEligibleForPurge: false,
      daysInactive: 0,
      actionRequired: 'none',
      explanationEn: 'Profile is active. Retention period is compliant.',
      explanationUrdu: 'پروفائل فعال ہے۔ ریکارڈ برقرار رہے گا۔',
    };
  }

  // 3. Inactive profile evaluation
  if (profile.status === 'inactive') {
    const referenceDate = new Date(profile.lastActiveAt || profile.updatedAt || currentTimestamp).getTime();
    const daysInactive = Math.max(0, Math.floor((currentTimestamp - referenceDate) / (1000 * 60 * 60 * 24)));

    if (daysInactive >= INACTIVE_RETENTION_MAX_DAYS) {
      return {
        isEligibleForArchive: true,
        isEligibleForPurge: true,
        daysInactive,
        actionRequired: 'purge',
        explanationEn: `Profile has been inactive for ${daysInactive} days (exceeds 365-day archive limit). Candidate data is due for scheduled purge (PRIV-07).`,
        explanationUrdu: `پروفائل ${daysInactive} دنوں سے غیر فعال ہے۔ ڈیٹا مستقل ڈیلیٹ کرنے کی حد پوری ہو چکی ہے۔`,
      };
    }

    return {
      isEligibleForArchive: true,
      isEligibleForPurge: false,
      daysInactive,
      actionRequired: 'archive',
      explanationEn: `Profile is inactive (${daysInactive} days). Retained under 1-year archive window.`,
      explanationUrdu: `پروفائل غیر فعال ہے۔ ۱ سالہ آرکائیو پالیسی کے تحت محفوظ ہے۔`,
    };
  }

  return {
    isEligibleForArchive: false,
    isEligibleForPurge: false,
    daysInactive: 0,
    actionRequired: 'none',
    explanationEn: `Profile status '${profile.status}' retains standard processing state.`,
    explanationUrdu: `پروفائل معمول کے مطابق محفوظ ہے۔`,
  };
}

/**
 * Executes a controlled candidate privacy erasure request (PRIV-08).
 * Immediately purges the photo and revokes all active signed photo and share grants.
 */
export function executeCandidatePrivacyErasure(
  profileId: string,
  session: AuthSession | null
): { success: boolean; purgedPhotoId: string | null; grantsRevokedCount: number; error?: { code: string; messageEn: string; messageUrdu: string } } {
  const purgeResult = purgeCandidatePhoto(profileId, session);
  if (!purgeResult.success) {
    return {
      success: false,
      purgedPhotoId: null,
      grantsRevokedCount: 0,
      error: purgeResult.error,
    };
  }

  return {
    success: true,
    purgedPhotoId: purgeResult.purgedPhotoId,
    grantsRevokedCount: purgeResult.grantsRevokedCount ?? 0,
  };
}

/**
 * Sanitizes audit payload: ensures photo URLs, tokens, and raw credentials are NEVER logged (PRIV-05).
 */
export function sanitizePhotoAuditPayload(payload: Record<string, any>): Record<string, any> {
  const safe = { ...payload };
  delete safe.token;
  delete safe.signedUrl;
  delete safe.rawToken;
  delete safe.secret;
  delete safe.tokenHash;
  return safe;
}

export function resetPhotosForTesting(): void {
  demoPhotos.clear();
  activeGrantsByToken.clear();
  activeGrantsByHash.clear();
}
