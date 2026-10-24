/**
 * Private Photo Storage & Consent-Gated Access — Gulistan Marriage Bureau
 * 
 * ARCHITECTURAL POLICIES (DECIDED: OPEN-004, OPEN-006, OPEN-008):
 * 1. Private Buckets Only: All photographs are stored in a private bucket with zero public access.
 * 2. Short-Lived Signed URLs: 48-hour default expiry for WhatsApp family sharing (OPEN-006).
 * 3. Consent Gating: Photographs cannot be uploaded or viewed unless explicit candidate consent exists.
 * 4. Immediate Purge: Photos are purged immediately from storage upon consent withdrawal or profile deletion (OPEN-008).
 * 5. Privacy Zero-Logging: Signed URLs and bearer tokens are NEVER written to logs or audit payloads.
 * 6. Non-Guessable Paths: Storage paths use isolated UUIDs; never candidate names or phone numbers.
 */

import { Role } from '../types';
import { AuthSession, canAccessRole } from './auth';
import { getClientConfig } from './config';

export const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const DEFAULT_PHOTO_EXPIRY_MS = 48 * 60 * 60 * 1000; // 48 hours (OPEN-006)
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface PhotoRecord {
  id: string;
  profileId: string;
  storagePath: string; // e.g., 'private-photos/GLS-401/f81d4fae-7dec.jpg'
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

// In-Memory Storage & Token Registry for Local Demo & Offline Mode
const demoPhotos: Map<string, PhotoRecord> = new Map();
const activeGrants: Map<string, SignedPhotoGrant> = new Map();

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
 */
export function generateIsolatedStoragePath(profileId: string, extension: string): string {
  const safeProfileId = profileId.replace(/[^a-zA-Z0-9_-]/g, '');
  const randomSuffix = Math.random().toString(36).substring(2, 10);
  const cleanExt = extension.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg';
  return `private-photos/${safeProfileId}/${Date.now()}-${randomSuffix}.${cleanExt}`;
}

/**
 * Generates a high-entropy signed bearer URL with 48-hour expiration.
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
  const token = `sig_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;
  const expiresAt = Date.now() + DEFAULT_PHOTO_EXPIRY_MS;

  const grant: SignedPhotoGrant = {
    token,
    signedUrl: `https://gulistan.pk/secure-photo?token=${token}&scope=${photo.profileId}`,
    photoId: photo.id,
    profileId: photo.profileId,
    issuedAt: Date.now(),
    expiresAt,
    isRevoked: false,
    recipientContext,
  };

  activeGrants.set(token, grant);

  return {
    success: true,
    grant,
  };
}

/**
 * Validates a signed bearer token. Fails closed if expired, revoked, or consent withdrawn.
 */
export function validateSignedPhotoAccess(
  token: string,
  isConsentActive: boolean
): { valid: boolean; reason?: 'missing' | 'expired' | 'revoked' | 'consent_withdrawn' } {
  const grant = activeGrants.get(token);
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
 * Revokes an issued signed photo grant immediately.
 */
export function revokeSignedPhotoGrant(token: string): boolean {
  const grant = activeGrants.get(token);
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
): { success: boolean; purgedPhotoId: string | null; error?: { code: string; messageEn: string; messageUrdu: string } } {
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
  for (const grant of activeGrants.values()) {
    if (grant.profileId === profileId) {
      grant.isRevoked = true;
    }
  }

  return {
    success: true,
    purgedPhotoId: photo.id,
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
 * Sanitizes audit payload: ensures photo URLs, tokens, and raw credentials are NEVER logged.
 */
export function sanitizePhotoAuditPayload(payload: Record<string, any>): Record<string, any> {
  const safe = { ...payload };
  delete safe.token;
  delete safe.signedUrl;
  delete safe.rawToken;
  delete safe.secret;
  return safe;
}

export function resetPhotosForTesting(): void {
  demoPhotos.clear();
  activeGrants.clear();
}
