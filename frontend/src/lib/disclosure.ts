/**
 * Controlled Disclosure & WhatsApp Proposal Draft Engine — Gulistan Marriage Bureau
 * 
 * ARCHITECTURAL SPECIFICATION & POLICY (OPEN-005 & OPEN-006):
 * 1. Server-Side Field Authorization: Client choices are treated strictly as requests;
 *    every disclosed field is evaluated and authorized against profile status, consent,
 *    and caller credentials.
 * 2. Injection Prevention: Client payload cannot inject disallowed or tampered fields.
 *    Attributes are read exclusively from verified database/repository records.
 * 3. Human-Gated Introduction (OPEN-005): Direct contact details and full legal names
 *    remain locked until mutual consent and matchmaker authorization (status: introduction_authorized).
 *    If status is 'active', candidate identity is protected: display name or reference only,
 *    and contact defaults to bureau office concierge.
 * 4. Time-Limited Signed Bearer Grants (OPEN-006): When a photo or profile link is shared,
 *    it is backed by a 48-hour cryptographic grant with instant revocation support.
 * 5. Audit Minimization: Generated share actions are logged with minimal metadata
 *    (grantId, authorized field names, timestamp) while strictly omitting raw phone numbers,
 *    tokens, photo URLs, or full message bodies.
 */

import { ProfileRecord, ProfileStatus } from '../types';
import { AuthSession, canAccessRole } from './auth';

export const DEFAULT_SHARE_GRANT_EXPIRY_MS = 48 * 60 * 60 * 1000; // 48 hours per OPEN-006
export const BUREAU_OFFICE_PHONE = '+92 300 0000000';
export const BUREAU_OFFICE_TITLE_EN = 'Gulistan Bureau Concierge';
export const BUREAU_OFFICE_TITLE_UR = 'گلستان بیورو رابطہ دفتر';

export type DisclosureFieldName =
  | 'ref_number'
  | 'name'
  | 'age'
  | 'height'
  | 'education'
  | 'occupation'
  | 'salary'
  | 'city'
  | 'caste'
  | 'sect'
  | 'family_summary'
  | 'property_summary'
  | 'contact_number'
  | 'photo_link';

export interface DisclosureRequestOptions {
  includeRefNumber?: boolean;
  includeName?: boolean;
  includeAge?: boolean;
  includeHeight?: boolean;
  includeEducation?: boolean;
  includeOccupation?: boolean;
  includeSalary?: boolean;
  includeCity?: boolean;
  includeCaste?: boolean;
  includeSect?: boolean;
  includeFamilySummary?: boolean;
  includePropertySummary?: boolean;
  includeContactNumber?: boolean;
  includePhotoLink?: boolean;
  customNote?: string;
}

export interface WithheldFieldReason {
  field: DisclosureFieldName;
  code: string;
  messageEn: string;
  messageUrdu: string;
}

export interface AuthorizedDisclosedData {
  refNumber?: string;
  name?: string;
  isLegalNameDisclosed: boolean;
  age?: number;
  height?: string;
  education?: string;
  occupation?: string;
  salary?: string;
  city?: string;
  caste?: string;
  sect?: string;
  familySummary?: string;
  propertySummary?: string;
  contactNumber?: string;
  isDirectContactDisclosed: boolean;
  photoGrantUrl?: string;
  customNote?: string;
}

export interface AuthorizedDisclosureSnapshot {
  candidateId: string;
  profileStatus: ProfileStatus;
  grantId: string;
  issuedAt: string;
  expiresAt: string;
  expiresAtMs: number;
  isRevoked: boolean;
  authorizedFields: DisclosureFieldName[];
  withheldReasons: WithheldFieldReason[];
  disclosedData: AuthorizedDisclosedData;
}

export interface GeneratedDraft {
  messageText: string;
  language: 'ur' | 'en';
  snapshot: AuthorizedDisclosureSnapshot;
  deepLinkUrl: string;
}

export interface DisclosureAuditRecord {
  actor_id: string;
  actor_role: string;
  action: 'proposal_share_draft_generated';
  target_type: 'profile';
  target_id: string;
  details: string; // JSON string with zero sensitive leaks
}

/**
 * Sanitizes optional matchmaker custom note against XSS or disallowed payload injections.
 */
export function sanitizeCustomNote(note?: string): string | undefined {
  if (!note || typeof note !== 'string') return undefined;
  const cleaned = note
    .trim()
    .replace(/[<>]/g, '') // strip HTML/XML delimiters
    .replace(/javascript:/gi, '')
    .slice(0, 300); // Max 300 characters
  return cleaned.length > 0 ? cleaned : undefined;
}

/**
 * Evaluates and strictly authorizes which candidate profile attributes can be disclosed.
 * Enforces OPEN-005 and OPEN-006 invariants server-side.
 */
export function authorizeDisclosure(
  profile: ProfileRecord,
  requested: DisclosureRequestOptions | Record<string, unknown>,
  session: AuthSession | null,
  photoSignedUrl?: string
): {
  success: boolean;
  snapshot?: AuthorizedDisclosureSnapshot;
  error?: { code: string; messageEn: string; messageUrdu: string };
} {
  // 1. Caller Authorization: Must be staff (Nadeem / Admin)
  if (!canAccessRole(session, 'nadeem')) {
    return {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        messageEn: 'Only authorized bureau matchmakers can generate proposal disclosure drafts.',
        messageUrdu: 'صرف مجاز میچ میکر ہی رشتے کی تفصیلات شیئر کرنے کا مسودہ تیار کر سکتے ہیں۔',
      },
    };
  }

  // 2. Profile Status Check: Profile must be active or introduction_authorized
  if (profile.status === 'pending_review') {
    return {
      success: false,
      error: {
        code: 'PROFILE_PENDING_REVIEW',
        messageEn: 'Cannot share proposal: Profile is pending staff review and verification.',
        messageUrdu: 'رشتہ شیئر نہیں کیا جا سکتا: پروفائل ابھی تصدیق اور منظوری کے مراحل میں ہے۔',
      },
    };
  }

  if (profile.status === 'restricted' || profile.status === 'inactive') {
    return {
      success: false,
      error: {
        code: 'PROFILE_NOT_SHAREABLE',
        messageEn: `Cannot share proposal: Profile status is '${profile.status}'.`,
        messageUrdu: `رشتہ شیئر نہیں کیا جا سکتا: پروفائل '${profile.status}' کیفیت میں ہے۔`,
      },
    };
  }

  const authorizedFields: DisclosureFieldName[] = [];
  const withheldReasons: WithheldFieldReason[] = [];
  const disclosedData: AuthorizedDisclosedData = {
    isLegalNameDisclosed: false,
    isDirectContactDisclosed: false,
  };

  const grantId = `grnt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const now = Date.now();
  const expiresAtMs = now + DEFAULT_SHARE_GRANT_EXPIRY_MS;
  const issuedAt = new Date(now).toISOString();
  const expiresAt = new Date(expiresAtMs).toISOString();

  // ---------------------------------------------------------------------------
  // Field 1: Reference ID (Standard, safe disclosure)
  // ---------------------------------------------------------------------------
  if (requested.includeRefNumber !== false) {
    authorizedFields.push('ref_number');
    disclosedData.refNumber = profile.id;
  }

  // ---------------------------------------------------------------------------
  // Field 2: Name (OPEN-005 Invariant)
  // Legal name remains locked until status === 'introduction_authorized'.
  // If status is 'active', legal name is withheld and display name is used instead.
  // ---------------------------------------------------------------------------
  if (requested.includeName) {
    if (profile.status === 'introduction_authorized') {
      authorizedFields.push('name');
      disclosedData.name = profile.fullName;
      disclosedData.isLegalNameDisclosed = true;
    } else {
      // Withheld legal name; provide safe display name
      authorizedFields.push('name');
      disclosedData.name = profile.displayName || `Candidate (${profile.id})`;
      disclosedData.isLegalNameDisclosed = false;
      withheldReasons.push({
        field: 'name',
        code: 'LEGAL_NAME_LOCKED_PENDING_INTRODUCTION',
        messageEn: 'Full legal name locked pending mutual consent and introduction authorization (OPEN-005). Display pseudonym provided.',
        messageUrdu: 'مکمل نام باہمی رضامندی اور تعارف کی منظوری تک محفوظ ہے۔ تعارفی نام فراہم کیا گیا ہے۔',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Field 3: Age & Height (Standard demographic)
  // ---------------------------------------------------------------------------
  if (requested.includeAge) {
    authorizedFields.push('age');
    disclosedData.age = profile.age;
  }

  if (requested.includeHeight) {
    authorizedFields.push('height');
    disclosedData.height = profile.height;
  }

  // ---------------------------------------------------------------------------
  // Field 4: Education & Occupation
  // ---------------------------------------------------------------------------
  if (requested.includeEducation) {
    authorizedFields.push('education');
    disclosedData.education = profile.education;
  }

  if (requested.includeOccupation) {
    authorizedFields.push('occupation');
    disclosedData.occupation = profile.occupation;
  }

  // ---------------------------------------------------------------------------
  // Field 5: Salary / Income
  // ---------------------------------------------------------------------------
  if (requested.includeSalary) {
    if (profile.monthlyIncomePKR && profile.monthlyIncomePKR > 0) {
      authorizedFields.push('salary');
      disclosedData.salary = `PKR ${profile.monthlyIncomePKR.toLocaleString()} / month`;
    } else {
      withheldReasons.push({
        field: 'salary',
        code: 'SALARY_NOT_RECORDED',
        messageEn: 'Monthly income is not recorded for this profile.',
        messageUrdu: 'اس پروفائل کی ماہانہ آمدنی درج نہیں ہے۔',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Field 6: City & Caste & Sect
  // ---------------------------------------------------------------------------
  if (requested.includeCity) {
    authorizedFields.push('city');
    disclosedData.city = profile.residenceArea
      ? `${profile.currentCity} (${profile.residenceArea})`
      : profile.currentCity;
  }

  if (requested.includeCaste) {
    authorizedFields.push('caste');
    disclosedData.caste = profile.caste;
  }

  if (requested.includeSect) {
    authorizedFields.push('sect');
    disclosedData.sect = profile.aqeedah;
  }

  // ---------------------------------------------------------------------------
  // Field 7: Family & Property Summaries
  // ---------------------------------------------------------------------------
  if (requested.includeFamilySummary) {
    authorizedFields.push('family_summary');
    disclosedData.familySummary = profile.familyBackgroundNotes;
  }

  if (requested.includePropertySummary) {
    authorizedFields.push('property_summary');
    const p = profile.property;
    disclosedData.propertySummary = `${p.areaMarlas} Marla (${p.propertyType}) in ${p.locality}, ${p.city}`;
  }

  // ---------------------------------------------------------------------------
  // Field 8: Contact Number (OPEN-005 Invariant)
  // Direct candidate phone remains locked until status === 'introduction_authorized'.
  // If status is 'active', direct contact is withheld and bureau office phone is substituted.
  // ---------------------------------------------------------------------------
  if (requested.includeContactNumber) {
    if (profile.status === 'introduction_authorized') {
      authorizedFields.push('contact_number');
      disclosedData.contactNumber = profile.contactPhone;
      disclosedData.isDirectContactDisclosed = true;
    } else {
      authorizedFields.push('contact_number');
      disclosedData.contactNumber = `${BUREAU_OFFICE_PHONE} (${BUREAU_OFFICE_TITLE_EN})`;
      disclosedData.isDirectContactDisclosed = false;
      withheldReasons.push({
        field: 'contact_number',
        code: 'DIRECT_CONTACT_LOCKED_PENDING_INTRODUCTION',
        messageEn: 'Direct candidate contact locked pending mutual consent (OPEN-005). Bureau concierge contact provided.',
        messageUrdu: 'امیدوار کا براہ راست فون نمبر باہمی رضامندی تک محفوظ ہے۔ بیورو رابطہ نمبر فراہم کیا گیا ہے۔',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Field 9: Photo Link (OPEN-006 Invariant)
  // Requires explicit photoPermissionGranted from candidate/family representative.
  // ---------------------------------------------------------------------------
  if (requested.includePhotoLink) {
    if (!profile.photoPermissionGranted) {
      withheldReasons.push({
        field: 'photo_link',
        code: 'PHOTO_CONSENT_DENIED',
        messageEn: 'Candidate photograph cannot be shared: Photo consent not granted or withdrawn.',
        messageUrdu: 'امیدوار کی تصویر شیئر نہیں کی جا سکتی: تصویر کی اجازت موجود نہیں ہے۔',
      });
    } else if (photoSignedUrl) {
      authorizedFields.push('photo_link');
      disclosedData.photoGrantUrl = photoSignedUrl;
    } else {
      withheldReasons.push({
        field: 'photo_link',
        code: 'PHOTO_URL_UNAVAILABLE',
        messageEn: 'Photo link could not be generated.',
        messageUrdu: 'تصویر کا لنک دستیاب نہیں ہو سکا۔',
      });
    }
  }

  // Custom Note sanitization
  if (typeof requested.customNote === 'string') {
    disclosedData.customNote = sanitizeCustomNote(requested.customNote);
  }

  const snapshot: AuthorizedDisclosureSnapshot = {
    candidateId: profile.id,
    profileStatus: profile.status,
    grantId,
    issuedAt,
    expiresAt,
    expiresAtMs,
    isRevoked: false,
    authorizedFields,
    withheldReasons,
    disclosedData,
  };

  return {
    success: true,
    snapshot,
  };
}

/**
 * Formats polite, culturally refined WhatsApp proposal draft messages in Urdu or English.
 */
export function generateAuthorizedWhatsAppDraft(
  snapshot: AuthorizedDisclosureSnapshot,
  language: 'ur' | 'en' = 'ur'
): GeneratedDraft {
  const data = snapshot.disclosedData;

  if (language === 'ur') {
    const lines: string[] = [];
    lines.push('السلام علیکم ورحمۃ اللہ،');
    lines.push('گلستان میرج بیورو کی جانب سے ایک مناسب اور معزز رشتے کی تفصیلات درج ذیل ہیں:');
    lines.push('----------------------------------');

    if (data.refNumber) lines.push(`*ریفرنس نمبر:* ${data.refNumber}`);
    if (data.name) lines.push(`*نام / تعارف:* ${data.name}`);
    if (data.age) lines.push(`*عمر:* ${data.age} سال`);
    if (data.height) lines.push(`*قد:* ${data.height}`);
    if (data.education) lines.push(`*تعلیم:* ${data.education}`);
    if (data.occupation) lines.push(`*پیشہ / ملازمت:* ${data.occupation}`);
    if (data.salary) lines.push(`*آمدنی:* ${data.salary}`);
    if (data.city) lines.push(`*شہر / رہائش:* ${data.city}`);
    if (data.caste) lines.push(`*قوم / برادری:* ${data.caste}`);
    if (data.sect) lines.push(`*مسلک / عقیدہ:* ${data.sect}`);
    if (data.familySummary) lines.push(`*خاندانی کوائف:* ${data.familySummary}`);
    if (data.propertySummary) lines.push(`*جائیداد / رہائش:* ${data.propertySummary}`);
    if (data.contactNumber) lines.push(`*رابطہ:* ${data.contactNumber}`);

    if (data.photoGrantUrl) {
      lines.push('----------------------------------');
      lines.push(`*محفوظ تصویر کا لنک (48 گھنٹے کے لیے فعال):* ${data.photoGrantUrl}`);
    }

    if (data.customNote) {
      lines.push('----------------------------------');
      lines.push(`*اضافی نوٹ:* ${data.customNote}`);
    }

    lines.push('----------------------------------');
    lines.push('آپ کے خاندان کا وقار اور رازداری ہماری اولین ترجیح ہے۔ براہِ کرم تفصیلات کا جائزہ لے کر مطلع فرمائیں۔');
    lines.push('نئے آغاز کے لیے نیک تمنائیں — ندیم احمد (گلستان میرج بیورو)');

    const messageText = lines.join('\n');
    const deepLinkUrl = `https://wa.me/?text=${encodeURIComponent(messageText)}`;

    return {
      messageText,
      language: 'ur',
      snapshot,
      deepLinkUrl,
    };
  }

  // English
  const lines: string[] = [];
  lines.push('Assalamu Alaikum,');
  lines.push('Proposal recommendation from Gulistan Marriage Bureau:');
  lines.push('----------------------------------');

  if (data.refNumber) lines.push(`*Reference ID:* ${data.refNumber}`);
  if (data.name) lines.push(`*Name / Intro:* ${data.name}`);
  if (data.age) lines.push(`*Age:* ${data.age} Years`);
  if (data.height) lines.push(`*Height:* ${data.height}`);
  if (data.education) lines.push(`*Education:* ${data.education}`);
  if (data.occupation) lines.push(`*Profession:* ${data.occupation}`);
  if (data.salary) lines.push(`*Income:* ${data.salary}`);
  if (data.city) lines.push(`*City / Location:* ${data.city}`);
  if (data.caste) lines.push(`*Caste / Biradari:* ${data.caste}`);
  if (data.sect) lines.push(`*Sect / Aqeedah:* ${data.sect}`);
  if (data.familySummary) lines.push(`*Family Background:* ${data.familySummary}`);
  if (data.propertySummary) lines.push(`*Property:* ${data.propertySummary}`);
  if (data.contactNumber) lines.push(`*Contact:* ${data.contactNumber}`);

  if (data.photoGrantUrl) {
    lines.push('----------------------------------');
    lines.push(`*Protected Photo Link (Valid for 48 Hours):* ${data.photoGrantUrl}`);
  }

  if (data.customNote) {
    lines.push('----------------------------------');
    lines.push(`*Note:* ${data.customNote}`);
  }

  lines.push('----------------------------------');
  lines.push('Family dignity and candidate privacy remain our highest priority. Please review with family elders and inform us.');
  lines.push('Warm regards for new beginnings — Nadeem Ahmed (Gulistan Marriage Bureau)');

  const messageText = lines.join('\n');
  const deepLinkUrl = `https://wa.me/?text=${encodeURIComponent(messageText)}`;

  return {
    messageText,
    language: 'en',
    snapshot,
    deepLinkUrl,
  };
}

/**
 * Creates an audit record that strictly minimizes sensitive information (Section 3.7).
 * Prohibits raw phone numbers, photo URLs, full message bodies, and bearer tokens.
 */
export function createDisclosureAuditRecord(
  snapshot: AuthorizedDisclosureSnapshot,
  session: AuthSession | null
): DisclosureAuditRecord {
  const detailsObject = {
    grantId: snapshot.grantId,
    authorizedFieldCount: snapshot.authorizedFields.length,
    authorizedFields: snapshot.authorizedFields,
    withheldCount: snapshot.withheldReasons.length,
    isLegalNameDisclosed: snapshot.disclosedData.isLegalNameDisclosed,
    isDirectContactDisclosed: snapshot.disclosedData.isDirectContactDisclosed,
    hasPhotoGrant: Boolean(snapshot.disclosedData.photoGrantUrl),
    expiresAt: snapshot.expiresAt,
  };

  return {
    actor_id: session?.user?.id || 'usr-nadeem',
    actor_role: session?.role || 'nadeem',
    action: 'proposal_share_draft_generated',
    target_type: 'profile',
    target_id: snapshot.candidateId,
    details: JSON.stringify(detailsObject),
  };
}

/**
 * Validates whether a time-limited share grant is currently active and unrevoked.
 */
export function validateShareGrant(grant: {
  expiresAtMs: number;
  isRevoked: boolean;
}): { valid: boolean; reason?: 'expired' | 'revoked' } {
  if (grant.isRevoked) {
    return { valid: false, reason: 'revoked' };
  }
  if (Date.now() > grant.expiresAtMs) {
    return { valid: false, reason: 'expired' };
  }
  return { valid: true };
}
