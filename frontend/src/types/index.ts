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
  marriageDetails?: string;
  childrenCount?: number;
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
  id: string; // e.g. GLS-101
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
  fatherStatus: 'alive' | 'deceased';
  fatherOccupation?: string;
  motherStatus: 'alive' | 'deceased';
  motherOccupation?: string;
  siblings: SiblingRecord[];
  familyBackgroundNotes: string;

  // Property
  property: PropertyDetails;

  // Preferences
  preferences: PartnerPreference;

  // Admin / Operational
  status: ProfileStatus;
  source: 'direct_web' | 'walk_in' | 'external_matchmaker' | 'phone_referral';
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
}

export interface FollowUpItem {
  id: string;
  profileId: string;
  candidateId?: string;
  personName: string;
  contactPhone: string;
  type: 'initial_consult' | 'proposal_decision' | 'meeting_arrangement' | 'photo_request' | 'payment_reminder';
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'completed' | 'overdue';
  notes: string;
}

export interface ExternalMatchmaker {
  id: string;
  name: string;
  city: string;
  phone: string;
  agencyName?: string;
  profilesReferredCount: number;
  successfulMatchesCount: number;
  outstandingBalancePKR: number; // positive = we owe them, negative = they owe us
  commissionRatePercent: number;
  status: 'active' | 'inactive';
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
