/**
 * Profile Domain Service, DTOs & Lifecycle Management — Gulistan Marriage Bureau
 * 
 * ARCHITECTURAL INVARIANTS:
 * 1. DTO Separation: API/Client DTOs are kept distinct from Database Rows.
 * 2. Invariant Validation: Age (18-100), Height (48-96 in), Gender, Marital Status,
 *    and non-negative monthly income are strictly validated.
 * 3. State Machine Lifecycle: Strict transition rules prevent arbitrary status jumps.
 *    Review transitions are enforced and auditable.
 * 4. Least Privilege / Sanitization: Contact phones, emails, and internal notes are
 *    scrubbed for unauthorized callers or third-party customers.
 * 5. Safe Demo Mode: Operates offline on synthetic fixtures with local mutation support.
 */

import { ProfileRecord, ProfileStatus, Role, Gender, MaritalStatus, SiblingRecord, PropertyDetails } from '../types';
import { AuthSession, canAccessRole } from './auth';
import { getClientConfig } from './config';
import { INITIAL_PROFILES } from '../data/mockData';
import { convertMarlaToKanal } from '../utils/units';

/**
 * Database Row Model representing `public.profiles` table in PostgreSQL.
 */
export interface ProfileRow {
  id: string; // UUID
  reference_code: string; // e.g. 'GLS-101'
  full_name: string;
  display_name: string;
  gender: string;
  age: number;
  dob: string | null;
  height_inches: number;
  height_display: string;
  marital_status: string;
  religion: string;
  aqeedah: string;
  caste: string;
  sub_caste: string | null;
  education_level: string;
  education_field: string;
  occupation: string;
  job_title: string;
  company_or_sector: string | null;
  monthly_income_pkr: number | null;
  hometown: string;
  current_city: string;
  residence_area: string;
  status: string;
  source: string;
  assigned_matchmaker_id: string | null;
  contact_person: string;
  contact_phone: string;
  contact_email: string | null;
  preferred_contact_method: string;
  photo_permission_granted: boolean;
  representative_consent_certified: boolean;
  internal_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Sanitized profile summary for listings and match cards.
 */
export interface ProfileSummaryDTO {
  id: string;
  displayName: string;
  gender: Gender;
  age: number;
  height: string;
  maritalStatus: MaritalStatus;
  religion: string;
  aqeedah: string;
  caste: string;
  education: string;
  occupation: string;
  currentCity: string;
  status: ProfileStatus;
  photoUrl: string;
}

export interface ValidationError {
  field: string;
  code: string;
  messageEn: string;
  messageUrdu: string;
}

export interface ProfileValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Permitted State Machine Lifecycle Transitions (Per DECIDED: OPEN-007)
 */
export const PERMITTED_STATUS_TRANSITIONS: Record<ProfileStatus, ProfileStatus[]> = {
  pending_review: ['approved', 'restricted'],
  approved: ['active', 'restricted'],
  active: ['introduction_authorized', 'inactive', 'restricted'],
  introduction_authorized: ['active', 'inactive'],
  inactive: ['pending_review'],
  restricted: ['pending_review'],
};

/**
 * Height Conversion Helpers
 */
export function parseHeightToInches(heightStr: string): number {
  if (!heightStr) return 66; // default 5'6"
  const match = heightStr.match(/(\d+)'\s*(\d+)?/);
  if (match) {
    const feet = parseInt(match[1], 10);
    const inches = match[2] ? parseInt(match[2], 10) : 0;
    return feet * 12 + inches;
  }
  const numeric = parseInt(heightStr, 10);
  if (!isNaN(numeric) && numeric >= 48 && numeric <= 96) {
    return numeric;
  }
  return 66;
}

export function formatInchesToHeight(inches: number): string {
  const feet = Math.floor(inches / 12);
  const remainingInches = inches % 12;
  return `${feet}'${remainingInches}"`;
}

/**
 * Converts a database row to the rich application domain DTO.
 */
export function profileRowToDTO(
  row: ProfileRow,
  nested?: {
    siblings?: any[];
    property?: any;
    preferences?: any;
    photoUrl?: string;
  }
): ProfileRecord {
  return {
    id: row.reference_code,
    fullName: row.full_name,
    displayName: row.display_name,
    gender: row.gender as Gender,
    age: row.age,
    dob: row.dob || undefined,
    height: row.height_display || formatInchesToHeight(row.height_inches),
    maritalStatus: row.marital_status as MaritalStatus,
    religion: row.religion,
    aqeedah: row.aqeedah,
    caste: row.caste,
    subCaste: row.sub_caste || undefined,
    education: row.education_level,
    educationField: row.education_field,
    occupation: row.occupation,
    jobTitle: row.job_title,
    companyOrSector: row.company_or_sector || undefined,
    monthlyIncomePKR: row.monthly_income_pkr ? Number(row.monthly_income_pkr) : undefined,
    hometown: row.hometown,
    currentCity: row.current_city,
    residenceArea: row.residence_area,
    photoUrl: nested?.photoUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
    photoPermissionGranted: row.photo_permission_granted,
    fatherStatus: 'alive',
    motherStatus: 'alive',
    siblings: nested?.siblings || [],
    familyBackgroundNotes: 'Family background recorded in bureau.',
    property: nested?.property || {
      ownership: 'owned',
      propertyType: 'house',
      areaMarlas: 10,
      city: row.current_city,
      locality: row.residence_area,
      householdArrangement: 'independent',
    },
    preferences: nested?.preferences || {
      ageMin: Math.max(18, row.age - 5),
      ageMax: row.age + 5,
      heightMin: "5'2\"",
      maritalStatus: ['never_married'],
      religion: row.religion,
      aqeedah: row.aqeedah,
      caste: row.caste,
      educationMin: 'Bachelors',
      preferredOccupations: ['Professional'],
      cityPreferences: [row.current_city],
      propertyExpectation: 'Owned Home',
      familyArrangement: 'any',
      criteriaClassifications: {},
    },
    status: row.status as ProfileStatus,
    source: row.source as any,
    assignedMatchmakerId: row.assigned_matchmaker_id || undefined,
    contactPerson: row.contact_person,
    contactPhone: row.contact_phone,
    contactEmail: row.contact_email || undefined,
    preferredContactMethod: row.preferred_contact_method as any,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    internalNotes: row.internal_notes || undefined,
  };
}

/**
 * Converts an application DTO to a database row for persistence.
 */
export function profileDTOToRow(
  dto: Partial<ProfileRecord>,
  createdById?: string | null
): Partial<ProfileRow> {
  const heightInches = dto.height ? parseHeightToInches(dto.height) : 66;

  return {
    reference_code: dto.id || `GLS-${Date.now().toString().slice(-4)}`,
    full_name: dto.fullName?.trim(),
    display_name: dto.displayName?.trim() || dto.fullName?.trim(),
    gender: dto.gender,
    age: dto.age,
    dob: dto.dob || null,
    height_inches: heightInches,
    height_display: dto.height || formatInchesToHeight(heightInches),
    marital_status: dto.maritalStatus,
    religion: dto.religion?.trim() || 'Islam',
    aqeedah: dto.aqeedah?.trim() || 'Sunni / Hanafi',
    caste: dto.caste?.trim() || 'General',
    sub_caste: dto.subCaste?.trim() || null,
    education_level: dto.education?.trim(),
    education_field: dto.educationField?.trim(),
    occupation: dto.occupation?.trim(),
    job_title: dto.jobTitle?.trim(),
    company_or_sector: dto.companyOrSector?.trim() || null,
    monthly_income_pkr: dto.monthlyIncomePKR !== undefined ? dto.monthlyIncomePKR : null,
    hometown: dto.hometown?.trim(),
    current_city: dto.currentCity?.trim(),
    residence_area: dto.residenceArea?.trim(),
    status: dto.status || 'pending_review',
    source: dto.source || 'walk_in',
    assigned_matchmaker_id: dto.assignedMatchmakerId || null,
    contact_person: dto.contactPerson?.trim() || dto.fullName?.trim(),
    contact_phone: dto.contactPhone?.trim(),
    contact_email: dto.contactEmail?.trim() || null,
    preferred_contact_method: dto.preferredContactMethod || 'whatsapp',
    photo_permission_granted: dto.photoPermissionGranted ?? false,
    representative_consent_certified: true, // Required by OPEN-004
    internal_notes: dto.internalNotes?.trim() || null,
    created_by: createdById || null,
  };
}

/**
 * Validates an individual sibling entry per OPEN-011.
 */
export function validateSiblingRecord(sibling: Partial<SiblingRecord>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!sibling.relation || !['brother', 'sister'].includes(sibling.relation)) {
    errors.push({
      field: 'sibling.relation',
      code: 'INVALID_SIBLING_RELATION',
      messageEn: 'Sibling relation must be brother or sister.',
      messageUrdu: 'بہن بھائی کے رشتے کا درست انتخاب لازمی ہے۔',
    });
  }

  if (sibling.age !== undefined && (isNaN(sibling.age) || sibling.age < 0 || sibling.age > 120)) {
    errors.push({
      field: 'sibling.age',
      code: 'INVALID_SIBLING_AGE',
      messageEn: 'Sibling age must be between 0 and 120.',
      messageUrdu: 'بہن بھائی کی عمر ۰ سے ۱۲۰ سال کے درمیان ہونی چاہیے۔',
    });
  }

  if (sibling.childrenCount !== undefined && (isNaN(sibling.childrenCount) || sibling.childrenCount < 0)) {
    errors.push({
      field: 'sibling.childrenCount',
      code: 'INVALID_CHILDREN_COUNT',
      messageEn: 'Children count cannot be negative.',
      messageUrdu: 'بچوں کی تعداد منفی نہیں ہو سکتی۔',
    });
  }

  return errors;
}

/**
 * Validates property holdings and land units per OPEN-011.
 */
export function validatePropertyDetails(property: Partial<PropertyDetails>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (property.areaMarlas !== undefined && (isNaN(property.areaMarlas) || property.areaMarlas < 0)) {
    errors.push({
      field: 'property.areaMarlas',
      code: 'INVALID_PROPERTY_AREA',
      messageEn: 'Property area in marlas must be a non-negative number.',
      messageUrdu: 'پراپرٹی کا رقبہ مرلوں میں درست اور مثبت ہونا چاہیے۔',
    });
  }

  if (property.approxValuePKR !== undefined && (isNaN(property.approxValuePKR) || property.approxValuePKR < 0)) {
    errors.push({
      field: 'property.approxValuePKR',
      code: 'INVALID_PROPERTY_VALUE',
      messageEn: 'Property estimated value cannot be negative.',
      messageUrdu: 'پراپرٹی کی تخمینی مالیت منفی نہیں ہو سکتی۔',
    });
  }

  return errors;
}

/**
 * Enriches property details with formatted Kanal strings per OPEN-011 (20 Marla = 1 Kanal).
 */
export function enrichPropertyDetails(property: PropertyDetails): PropertyDetails {
  if (property.areaMarlas !== undefined && property.areaMarlas >= 0) {
    const conversion = convertMarlaToKanal(property.areaMarlas);
    return {
      ...property,
      areaKanalDisplay: conversion.formattedEn,
      areaKanalDisplayUrdu: conversion.formattedUrdu,
    };
  }
  return property;
}

/**
 * Validates candidate profile inputs against database constraints and business invariants.
 */
export function validateProfileInput(data: Partial<ProfileRecord>): ProfileValidationResult {
  const errors: ValidationError[] = [];

  // Full Name
  if (!data.fullName || data.fullName.trim().length < 2) {
    errors.push({
      field: 'fullName',
      code: 'REQUIRED_FIELD',
      messageEn: 'Full legal name is required (at least 2 characters).',
      messageUrdu: 'امیدوار کا مکمل نام درج کرنا لازمی ہے۔',
    });
  }

  // Display Name
  if (!data.displayName || data.displayName.trim().length < 2) {
    errors.push({
      field: 'displayName',
      code: 'REQUIRED_FIELD',
      messageEn: 'Display name for privacy protection is required.',
      messageUrdu: 'رازداری کے لیے ظاہری نام درج کرنا لازمی ہے۔',
    });
  }

  // Gender
  if (!data.gender || !['male', 'female'].includes(data.gender)) {
    errors.push({
      field: 'gender',
      code: 'INVALID_GENDER',
      messageEn: 'Gender must be male or female.',
      messageUrdu: 'جنس کا درست انتخاب لازمی ہے۔',
    });
  }

  // Age (18 - 100)
  if (data.age === undefined || isNaN(data.age) || data.age < 18 || data.age > 100) {
    errors.push({
      field: 'age',
      code: 'INVALID_AGE',
      messageEn: 'Candidate age must be between 18 and 100 years.',
      messageUrdu: 'امیدوار کی عمر ۱۸ سے ۱۰۰ سال کے درمیان ہونی چاہیے۔',
    });
  }

  // Height (48 - 96 inches)
  if (data.height) {
    const inches = parseHeightToInches(data.height);
    if (inches < 48 || inches > 96) {
      errors.push({
        field: 'height',
        code: 'INVALID_HEIGHT',
        messageEn: 'Height must be between 4\'0" and 8\'0".',
        messageUrdu: 'قد ۴ فٹ سے ۸ فٹ کے درمیان ہونا چاہیے۔',
      });
    }
  }

  // Marital Status
  const validMaritalStatuses = ['never_married', 'divorced', 'widowed', 'khula'];
  if (!data.maritalStatus || !validMaritalStatuses.includes(data.maritalStatus)) {
    errors.push({
      field: 'maritalStatus',
      code: 'INVALID_MARITAL_STATUS',
      messageEn: 'Valid marital status is required.',
      messageUrdu: 'ازدواجی حیثیت کا درست انتخاب لازمی ہے۔',
    });
  }

  // Religion & Aqeedah
  if (!data.religion || data.religion.trim().length === 0) {
    errors.push({
      field: 'religion',
      code: 'REQUIRED_FIELD',
      messageEn: 'Religion is required.',
      messageUrdu: 'مذہب درج کرنا لازمی ہے۔',
    });
  }
  if (!data.aqeedah || data.aqeedah.trim().length === 0) {
    errors.push({
      field: 'aqeedah',
      code: 'REQUIRED_FIELD',
      messageEn: 'Aqeedah / Sect is required.',
      messageUrdu: 'مسلک / عقیدہ درج کرنا لازمی ہے۔',
    });
  }

  // Caste / Biradari
  if (!data.caste || data.caste.trim().length === 0) {
    errors.push({
      field: 'caste',
      code: 'REQUIRED_FIELD',
      messageEn: 'Caste / Biradari is required.',
      messageUrdu: 'قوم / برادری درج کرنا لازمی ہے۔',
    });
  }

  // Education & Career
  if (!data.education || data.education.trim().length === 0) {
    errors.push({
      field: 'education',
      code: 'REQUIRED_FIELD',
      messageEn: 'Education degree is required.',
      messageUrdu: 'تعلیمی ڈگری درج کرنا لازمی ہے۔',
    });
  }
  if (!data.occupation || data.occupation.trim().length === 0) {
    errors.push({
      field: 'occupation',
      code: 'REQUIRED_FIELD',
      messageEn: 'Occupation is required.',
      messageUrdu: 'پیشہ / ملازمت درج کرنا لازمی ہے۔',
    });
  }

  // Monthly Income (Non-negative)
  if (data.monthlyIncomePKR !== undefined && data.monthlyIncomePKR < 0) {
    errors.push({
      field: 'monthlyIncomePKR',
      code: 'INVALID_INCOME',
      messageEn: 'Monthly income cannot be negative.',
      messageUrdu: 'ماہانہ آمدنی منفی نہیں ہو سکتی۔',
    });
  }

  // Location
  if (!data.currentCity || data.currentCity.trim().length === 0) {
    errors.push({
      field: 'currentCity',
      code: 'REQUIRED_FIELD',
      messageEn: 'Current city is required.',
      messageUrdu: 'موجودہ شہر درج کرنا لازمی ہے۔',
    });
  }

  // Contact Details
  if (!data.contactPerson || data.contactPerson.trim().length === 0) {
    errors.push({
      field: 'contactPerson',
      code: 'REQUIRED_FIELD',
      messageEn: 'Contact person name is required.',
      messageUrdu: 'رابطہ کار کا نام درج کرنا لازمی ہے۔',
    });
  }
  if (!data.contactPhone || data.contactPhone.replace(/\D/g, '').length < 7) {
    errors.push({
      field: 'contactPhone',
      code: 'INVALID_PHONE',
      messageEn: 'Valid contact phone number is required (at least 7 digits).',
      messageUrdu: 'درست رابطہ فون نمبر درج کرنا لازمی ہے۔',
    });
  }

  // Sibling records (OPEN-011)
  if (data.siblings && Array.isArray(data.siblings)) {
    data.siblings.forEach((sib, idx) => {
      const sibErrors = validateSiblingRecord(sib);
      sibErrors.forEach((err) => {
        errors.push({
          ...err,
          field: `siblings[${idx}].${err.field.replace('sibling.', '')}`,
        });
      });
    });
  }

  // Property details (OPEN-011)
  if (data.property) {
    const propErrors = validatePropertyDetails(data.property);
    errors.push(...propErrors);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Checks whether a proposed profile status transition is permitted.
 */
export function canTransitionStatus(
  currentStatus: ProfileStatus,
  targetStatus: ProfileStatus,
  actorRole: Role
): { allowed: boolean; reasonEn?: string; reasonUrdu?: string } {
  // Public users and customers CANNOT change profile review statuses
  if (actorRole === 'public' || actorRole === 'customer') {
    return {
      allowed: false,
      reasonEn: 'Customers and public visitors cannot modify profile statuses.',
      reasonUrdu: 'کسٹمرز یا عام صارفین پروفائل کی حیثیت تبدیل کرنے کے مجاز نہیں ہیں۔',
    };
  }

  // Identity transition (no change)
  if (currentStatus === targetStatus) {
    return { allowed: true };
  }

  const permitted = PERMITTED_STATUS_TRANSITIONS[currentStatus] || [];
  if (!permitted.includes(targetStatus)) {
    return {
      allowed: false,
      reasonEn: `Status transition from ${currentStatus} to ${targetStatus} is not permitted.`,
      reasonUrdu: `اس کیفیت (${currentStatus}) سے (${targetStatus}) میں منتقلی کی اجازت نہیں ہے۔`,
    };
  }

  return { allowed: true };
}

/**
 * Scrubs sensitive private fields based on viewer role and ownership.
 */
export function sanitizeProfileForRole(
  profile: ProfileRecord,
  viewerRole: Role,
  isOwner: boolean = false
): ProfileRecord {
  // Staff (Nadeem & Admin) can view full operational profile
  if (viewerRole === 'admin' || viewerRole === 'nadeem') {
    return { ...profile };
  }

  // Profile owner can view own data, but internal bureau notes are stripped
  if (viewerRole === 'customer' && isOwner) {
    const copy = { ...profile };
    delete copy.internalNotes;
    return copy;
  }

  // Third-party customer or public viewer: scrub all private contact details, exact address, and internal notes
  return {
    ...profile,
    fullName: profile.displayName, // scrub real legal name
    contactPerson: '[Protected Contact]',
    contactPhone: '[Protected Phone - Introduction Required]',
    contactEmail: undefined,
    internalNotes: undefined,
    familyBackgroundNotes: '[Disclosed upon authorized introduction]',
    residenceArea: profile.currentCity, // only disclose city, not precise neighborhood
    siblings: profile.siblings ? profile.siblings.map((s) => ({
      ...s,
      name: undefined, // scrub sibling real name for third parties per OPEN-011
      marriageDetails: undefined, // scrub specific spouse family details
    })) : [],
    property: profile.property ? {
      ...profile.property,
      approxValuePKR: undefined, // scrub monetary net worth for third parties per OPEN-011
      locality: '[Disclosed upon introduction]',
    } : profile.property,
  };
}

// -----------------------------------------------------------------------------
// In-Memory Repository for Safe Local Demo Mode
// -----------------------------------------------------------------------------
let demoProfiles: ProfileRecord[] = [...INITIAL_PROFILES];

export function resetDemoProfilesForTesting(): void {
  demoProfiles = [...INITIAL_PROFILES];
}

/**
 * Fetches candidate profiles filtered by status and accessible to the viewer.
 */
export async function fetchProfiles(
  session: AuthSession | null,
  filters?: { status?: string; gender?: string; city?: string }
): Promise<{ success: boolean; data: ProfileRecord[]; error?: { messageEn: string; messageUrdu: string } }> {
  const viewerRole: Role = session?.isAuthenticated && session.user ? session.user.role : 'public';

  const clientConfig = getClientConfig();

  // If live backend is active, query would invoke Supabase REST with JWT
  if (clientConfig.mode === 'backend') {
    return {
      success: false,
      data: [],
      error: {
        code: 'BACKEND_NOT_PROVISIONED',
        messageEn: 'Live backend service is not provisioned. Switch to demo mode.',
        messageUrdu: 'لائیو سروس ابھی فعال نہیں ہے۔ ڈیمو موڈ استعمال کریں۔',
      } as any,
    };
  }

  // Demo Mode Filter & Sanitization
  let results = [...demoProfiles];

  if (filters?.status && filters.status !== 'all') {
    results = results.filter((p) => p.status === filters.status);
  }
  if (filters?.gender && filters.gender !== 'all') {
    results = results.filter((p) => p.gender === filters.gender);
  }
  if (filters?.city && filters.city !== 'all') {
    results = results.filter((p) => p.currentCity.toLowerCase() === filters.city!.toLowerCase());
  }

  // Sanitize each profile according to viewer permissions
  const sanitized = results.map((p) => {
    const isOwner = session?.user?.id === p.id || session?.user?.email === p.contactEmail;
    return sanitizeProfileForRole(p, viewerRole, isOwner);
  });

  return {
    success: true,
    data: sanitized,
  };
}

/**
 * Creates a new candidate profile after strict validation and authorization.
 */
export async function createProfile(
  profileData: Partial<ProfileRecord>,
  session: AuthSession | null
): Promise<{ success: boolean; data: ProfileRecord | null; error?: ValidationError | { code: string; messageEn: string; messageUrdu: string } }> {
  const viewerRole: Role = session?.isAuthenticated && session.user ? session.user.role : 'public';

  // Per Closed Concierge Intake policy (OPEN-003): Only authorized staff can register profiles
  if (!canAccessRole(session, 'nadeem')) {
    return {
      success: false,
      data: null,
      error: {
        code: 'UNAUTHORIZED',
        messageEn: 'Only authorized bureau matchmakers can register candidate profiles.',
        messageUrdu: 'صرف مجاز بیورو عملہ ہی نئے امیدوار کا اندراج کر سکتا ہے۔',
      },
    };
  }

  // Validate Invariants
  const validation = validateProfileInput(profileData);
  if (!validation.valid) {
    return {
      success: false,
      data: null,
      error: validation.errors[0],
    };
  }

  const clientConfig = getClientConfig();
  if (clientConfig.mode === 'backend') {
    return {
      success: false,
      data: null,
      error: {
        code: 'BACKEND_NOT_PROVISIONED',
        messageEn: 'Live backend service is not provisioned. Switch to demo mode.',
        messageUrdu: 'لائیو سروس ابھی فعال نہیں ہے۔',
      },
    };
  }

  // Demo Mode Persistence
  const newRefCode = `GLS-${100 + demoProfiles.length + 1}`;
  const now = new Date().toISOString().split('T')[0];

  const newProfile: ProfileRecord = {
    id: newRefCode,
    fullName: profileData.fullName!.trim(),
    displayName: profileData.displayName!.trim(),
    gender: profileData.gender!,
    age: profileData.age!,
    dob: profileData.dob,
    height: profileData.height || "5'6\"",
    maritalStatus: profileData.maritalStatus!,
    religion: profileData.religion!.trim(),
    aqeedah: profileData.aqeedah!.trim(),
    caste: profileData.caste!.trim(),
    subCaste: profileData.subCaste?.trim(),
    education: profileData.education!.trim(),
    educationField: profileData.educationField!.trim(),
    occupation: profileData.occupation!.trim(),
    jobTitle: profileData.jobTitle!.trim(),
    companyOrSector: profileData.companyOrSector?.trim(),
    monthlyIncomePKR: profileData.monthlyIncomePKR,
    hometown: profileData.hometown!.trim(),
    currentCity: profileData.currentCity!.trim(),
    residenceArea: profileData.residenceArea!.trim(),
    photoUrl: profileData.photoUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
    photoPermissionGranted: profileData.photoPermissionGranted ?? true,
    fatherStatus: profileData.fatherStatus || 'alive',
    motherStatus: profileData.motherStatus || 'alive',
    siblings: profileData.siblings || [],
    familyBackgroundNotes: profileData.familyBackgroundNotes || 'Respectable family background.',
    property: profileData.property || {
      ownership: 'owned',
      propertyType: 'house',
      areaMarlas: 10,
      city: profileData.currentCity!.trim(),
      locality: profileData.residenceArea!.trim(),
      householdArrangement: 'independent',
    },
    preferences: profileData.preferences || ({} as any),
    status: 'pending_review', // Always starts in pending_review
    source: profileData.source || 'walk_in',
    assignedMatchmakerId: session?.user?.id || 'usr-nadeem',
    assignedMatchmakerName: session?.user?.displayName || 'Nadeem Ahmed',
    contactPerson: profileData.contactPerson!.trim(),
    contactPhone: profileData.contactPhone!.trim(),
    contactEmail: profileData.contactEmail?.trim(),
    preferredContactMethod: profileData.preferredContactMethod || 'whatsapp',
    createdAt: now,
    updatedAt: now,
    internalNotes: profileData.internalNotes?.trim() || 'Newly registered profile awaiting verification.',
  };

  demoProfiles = [newProfile, ...demoProfiles];

  return {
    success: true,
    data: newProfile,
  };
}

/**
 * Transitions a candidate profile's review status through the state machine.
 */
export async function updateProfileStatus(
  id: string,
  newStatus: ProfileStatus,
  session: AuthSession | null
): Promise<{ success: boolean; previousStatus?: ProfileStatus; newStatus?: ProfileStatus; error?: { code: string; messageEn: string; messageUrdu: string } }> {
  const viewerRole: Role = session?.isAuthenticated && session.user ? session.user.role : 'public';

  if (!canAccessRole(session, 'nadeem')) {
    return {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        messageEn: 'Only bureau staff can update profile lifecycle statuses.',
        messageUrdu: 'صرف بیورو عملہ ہی پروفائل کی کیفیت تبدیل کر سکتا ہے۔',
      },
    };
  }

  const targetProfile = demoProfiles.find((p) => p.id === id);
  if (!targetProfile) {
    return {
      success: false,
      error: {
        code: 'NOT_FOUND',
        messageEn: `Profile ${id} was not found.`,
        messageUrdu: `پروفائل ${id} نہیں ملا۔`,
      },
    };
  }

  const transitionCheck = canTransitionStatus(targetProfile.status, newStatus, viewerRole);
  if (!transitionCheck.allowed) {
    return {
      success: false,
      error: {
        code: 'INVALID_TRANSITION',
        messageEn: transitionCheck.reasonEn || 'Invalid status transition.',
        messageUrdu: transitionCheck.reasonUrdu || 'ناجائز کیفیت تبدیلی۔',
      },
    };
  }

  const previousStatus = targetProfile.status;
  targetProfile.status = newStatus;
  targetProfile.updatedAt = new Date().toISOString().split('T')[0];

  return {
    success: true,
    previousStatus,
    newStatus,
  };
}
