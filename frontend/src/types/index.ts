/**
 * Core Domain Types for Gulistan Marriage Bureau
 */

export type Role = 'public' | 'nadeem' | 'customer' | 'admin';
export type Language = 'en' | 'ur';

export type { FinancialTransaction } from '../utils/finance';

export type MaritalStatus = 'never_married' | 'divorced' | 'widowed' | 'khula';
export type Gender = 'male' | 'female';
export type ProfileStatus = 'pending_review' | 'approved' | 'active' | 'introduction_authorized' | 'inactive' | 'restricted';
export type CriteriaImportance = 'mandatory' | 'preferred' | 'acceptable_range' | 'unknown' | 'not_disclosed';

export interface SiblingRecord {
  id: string;
  relation: 'brother' | 'sister';
  name?: string;
  age?: number;
  maritalStatus: MaritalStatus | 'married';
  occupation?: string;
  education?: string;
  marriageDetails?: string;
  spouseFamilyDetails?: string;
  childrenCount?: number;
  orderIndex?: number;
}

export interface PropertyDetails {
  ownership: 'owned' | 'rented' | 'family_owned' | 'other';
  propertyType: 'house' | 'plot' | 'apartment' | 'commercial' | 'agricultural';
  areaMarlas: number;
  areaKanalDisplay?: string;
  areaKanalDisplayUrdu?: string;
  approxValuePKR?: number;
  city: string;
  locality: string;
  householdArrangement: 'independent' | 'joint_family';
  homeSizeDescription?: string;
}

export interface PartnerPreference {
  ageMin: number;
  ageMax: number;
  heightMin: string;
  maritalStatus: MaritalStatus[];
  religion: string;
  aqeedah: string;
  caste: string;
  educationMin: string;
  preferredOccupations: string[];
  cityPreferences: string[];
  propertyExpectation: string;
  familyArrangement: 'independent' | 'joint_family' | 'any';
  lifestyleNotes?: string;
  relocationPreference?: 'willing_to_relocate' | 'cannot_relocate' | 'discuss_later';
  workAfterMarriagePreference?: 'must_work' | 'optional' | 'family_focused' | 'discuss_later';
  criteriaClassifications: Record<string, 'mandatory' | 'preferred' | 'acceptable_range' | 'unknown' | 'not_disclosed'>;
}

export interface ProfileRecord {
  id: string; // reference_code (e.g. GLS-101) or UUID
  databaseId?: string; // PostgreSQL UUID primary key
  referenceCode?: string; // Human-readable reference code
  accountId?: string; // Customer owner user account UUID
  createdBy?: string; // Creator user account UUID
  fullName: string;
  displayName: string;
  gender: Gender;
  age: number;
  dob?: string;
  height: string;
  maritalStatus: MaritalStatus;
  religion: string;
  aqeedah: string;
  caste: string;
  subCaste?: string;
  education: string;
  educationField: string;
  occupation: string;
  jobTitle: string;
  companyOrSector?: string;
  monthlyIncomePKR?: number;
  hometown: string;
  currentCity: string;
  residenceArea: string;
  photoUrl: string;
  photoPermissionGranted: boolean;
  specialQualities?: string;
  hobbies?: string[];
  
  // Family
  fatherName?: string;
  fatherStatus?: 'alive' | 'deceased';
  fatherOccupation?: string;
  motherStatus?: 'alive' | 'deceased';
  motherOccupation?: string;
  siblings: SiblingRecord[];
  familyBackgroundNotes?: string;

  // Property (Optional: absent property is undefined, not fabricated per P1-09)
  property?: PropertyDetails;

  // Preferences
  preferences: PartnerPreference;

  // Consent & Verification
  representativeConsentCertified?: boolean;

  // Admin / Operational
  status: ProfileStatus;
  source: 'direct_web' | 'walk_in' | 'external_matchmaker' | 'phone_referral' | 'whatsapp_migration' | 'gallery_migration';
  assignedMatchmakerId?: string;
  assignedMatchmakerName?: string;
  contactPerson: string;
  contactPhone: string;
  contactEmail?: string;
  preferredContactMethod: 'whatsapp' | 'phone' | 'email';
  createdAt: string;
  updatedAt: string;
  internalNotes?: string;
}

export interface MatchRecommendation {
  id: string;
  caseCode?: string;
  requestingProfileId: string;
  candidateProfileId: string;
  matchScore: number;
  compatibilitySummaryEn: string;
  compatibilitySummaryUrdu: string;
  status: 'suggested' | 'approved_by_nadeem' | 'shared_with_parties' | 'accepted_by_customer' | 'rejected' | 'deferred';
  sharedViaWhatsAppAt?: string;
  disclosureSnapshot?: Record<string, boolean>;
  customerFeedback?: 'interested' | 'not_interested' | 'considering';
  reviewedDate: string;
  candidateProfile?: Partial<ProfileRecord>;
}

export interface FollowUpItem {
  id: string;
  profileId: string;
  candidateId?: string;
  personName: string;
  contactPhone: string;
  type:
    | 'initial_consult'
    | 'proposal_decision'
    | 'meeting_arrangement'
    | 'photo_request'
    | 'payment_reminder'
    | 'profile_correction'
    | 'deactivation_request'
    | 'photo_consent_change'
    | 'customer_inquiry';
  dueDate: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  status: 'pending' | 'completed' | 'overdue' | 'cancelled';
  notes: string;
  assignedTo?: string;
  reminderSentAt?: string;
  notificationChannel?: 'in_app' | 'email' | 'whatsapp' | 'sms';
}

export interface ExternalMatchmaker {
  id: string;
  name: string;
  city: string;
  phone: string;
  agencyName?: string;
  profilesReferredCount: number;
  successfulMatchesCount: number;
  outstandingBalancePKR: number; // OPEN-010: positive = partner owes bureau (asset), negative = bureau owes partner (liability)
  commissionRatePercent: number;
  status: 'active' | 'inactive' | 'suspended';
}

export type PartnerCommissionModel = 'percentage' | 'flat_fee' | 'tiered' | 'hybrid';
export type PartnerAgreementFeeType = 'percentage' | 'flat_fee' | 'tiered';

export interface PartnerAgreement {
  id: string;
  matchmakerId: string;
  agreementCode: string;
  feeType: PartnerAgreementFeeType;
  percentageRate?: number;
  flatFeePKR?: number;
  tieredRulesJson?: Record<string, any>;
  effectiveFrom: string;
  effectiveTo?: string;
  termsText: string;
  isActive: boolean;
  createdAt: string;
}

export interface ReferralAttribution {
  id: string;
  matchmakerId: string;
  profileId: string;
  referralSource: string;
  attributedBy?: string;
  notes?: string;
  createdAt: string;
}

export interface DetailedExternalMatchmaker extends ExternalMatchmaker {
  code: string;
  email?: string;
  commissionModel: PartnerCommissionModel;
  termsJson?: Record<string, any>;
  agreements: PartnerAgreement[];
  activeAgreement?: PartnerAgreement;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  actor: string;
  role: string;
  action: string;
  targetId: string;
  details: string;
}

// =============================================================================
// Staged Migration & Quarantine Domain Types (T-028, T-038)
// =============================================================================

export type MigrationSourceType = 'whatsapp_chat_export' | 'phone_gallery_archive' | 'csv_template';

export type MigrationBatchStatus =
  | 'cataloged'
  | 'staged'
  | 'dry_run_completed'
  | 'approved_by_owner'
  | 'imported'
  | 'reconciled'
  | 'rolled_back';

export type MigrationRecordStatus =
  | 'staged'
  | 'quarantined'
  | 'approved'
  | 'imported'
  | 'rejected'
  | 'rolled_back';

export type ResolutionAction = 'create_new' | 'merge_update' | 'reject';

export interface SourceProvenance {
  sourceType: MigrationSourceType;
  sourceReference: string;
  sourceChecksum: string;
  extractedBy: string;
  extractedAt: string;
}

export interface ConsentVerification {
  representativeConsentCertified: boolean;
  candidateConsentGranted: boolean;
  photoConsentGranted: boolean;
  verifiedBy: string;
  verifiedAt: string;
  notes?: string;
}

export interface MigrationBatchRecord {
  id: string;
  batchCode: string;
  sourceType: MigrationSourceType;
  sourceReference: string;
  sourceChecksum: string;
  totalRecords: number;
  stagedRecords: number;
  quarantinedRecords: number;
  importedRecords: number;
  status: MigrationBatchStatus;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  ownerApprovedBy?: string;
  ownerApprovedAt?: string;
  reconciledAt?: string;
  rolledBackAt?: string;
  rollbackReason?: string;
}

export interface MigrationStagedRecord {
  id: string;
  batchId: string;
  rowIndex: number;
  rawContent?: string | null;
  parsedData: Partial<ProfileRecord>;
  sourceProvenance: SourceProvenance;
  consentVerification: ConsentVerification;
  status: MigrationRecordStatus;
  quarantineReason?: 'DUPLICATE_SUSPECT' | 'CONSENT_UNVERIFIED' | 'DATA_VALIDATION_ERROR';
  conflictProfileId?: string;
  conflictDetails?: string;
  resolutionAction?: ResolutionAction;
  resolutionNotes?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  importedProfileId?: string;
  createdAt?: string;
  isRawPurged?: boolean;
  rawContentHash?: string;
}

export interface DryRunSummary {
  batchId: string;
  batchCode: string;
  totalRows: number;
  validRows: number;
  quarantinedDuplicates: number;
  quarantinedMissingConsent: number;
  readyForImport: number;
  validationErrors: Array<{ rowIndex: number; field: string; error: string }>;
  requiresOwnerApproval: boolean;
  simulatedAt: string;
}

export interface ReconciliationReport {
  batchId: string;
  batchCode: string;
  totalBatchRows: number;
  importedCount: number;
  quarantinedCount: number;
  rejectedCount: number;
  discrepancyCount: number;
  checksumVerified: boolean;
  isBalanced: boolean;
  details: string;
}

export interface GalleryPhotoEntry {
  fileName: string;
  fileSize: number;
  mimeType: string;
  candidateName?: string;
  contactPhone?: string;
  consentConfirmed?: boolean;
  fileBytes?: Uint8Array | string;
}

