/**
 * Persistence Repositories & Data Access Layer — Gulistan Marriage Bureau
 *
 * ARCHITECTURAL INVARIANTS:
 * 1. Typed Persistence Boundary: Separates presentation components from data layer.
 * 2. Supabase Integration: In 'backend' mode, executes real SQL/REST queries with JWT session.
 * 3. Safe Demo Fallback: In 'demo' mode, provides safe offline in-memory mutation without leaking.
 * 4. Lossless DTO Mapping: Converts between PostgreSQL tables and application domain DTOs.
 * 5. Least Privilege & Sanitization: Scrubs sensitive private data for unauthorized viewers.
 */

import {
  ProfileRecord,
  ProfileStatus,
  FollowUpItem,
  Role,
  ExternalMatchmaker,
  DetailedExternalMatchmaker,
  PartnerAgreement,
  PartnerAgreementFeeType,
  PartnerCommissionModel,
  AuditLogItem,
} from '../types';
import { FinancialTransaction } from '../utils/finance';
import { AuthSession, canAccessRole } from './auth';
import { getClientConfig } from './config';
import { getSupabaseClient } from './supabaseClient';
import { MatchEvaluation, EvaluatedCriterion } from './matching';
import { generateCryptoUUID } from './crypto';
import {
  ProfileRow,
  profileRowToDTO,
  profileDTOToRow,
  sanitizeProfileForRole,
  validateProfileInput,
  canTransitionStatus,
} from './profiles';
import {
  INITIAL_PROFILES,
  INITIAL_FOLLOW_UPS,
  INITIAL_TRANSACTIONS,
  INITIAL_MATCHMAKERS,
  INITIAL_AUDIT_LOGS,
} from '../data/mockData';
export type { PartnerLedgerSummary, BureauReconciliationSummary };
import {
  PartnerLedgerSummary,
  BureauReconciliationSummary,
  calculatePartnerLedger,
  reconcileLedger,
} from './finance';

// =============================================================================
// Interfaces
// =============================================================================

export interface ProfileFilters {
  status?: string;
  gender?: string;
  city?: string;
}

export interface IProfileRepository {
  findById(id: string, session: AuthSession | null): Promise<ProfileRecord | null>;
  findAll(session: AuthSession | null, filters?: ProfileFilters): Promise<ProfileRecord[]>;
  create(profileData: Partial<ProfileRecord>, session: AuthSession | null): Promise<ProfileRecord>;
  updateStatus(id: string, newStatus: ProfileStatus, session: AuthSession | null): Promise<ProfileRecord>;
}

export interface IFinanceRepository {
  findAll(
    session: AuthSession | null,
    filters?: { matchmakerId?: string; status?: string; type?: string }
  ): Promise<FinancialTransaction[]>;
  findById(id: string, session: AuthSession | null): Promise<FinancialTransaction | null>;
  record(txData: Partial<FinancialTransaction>, session: AuthSession | null): Promise<FinancialTransaction>;
  reverse(id: string, reason: string, session: AuthSession | null): Promise<FinancialTransaction>;
  getPartnerSummary(matchmakerId: string, session: AuthSession | null): Promise<PartnerLedgerSummary>;
  reconcile(session: AuthSession | null): Promise<BureauReconciliationSummary>;
}

export interface ICRMRepository {
  findAll(
    session: AuthSession | null,
    filters?: { status?: string; priority?: string; profileId?: string }
  ): Promise<FollowUpItem[]>;
  findById(id: string, session: AuthSession | null): Promise<FollowUpItem | null>;
  create(itemData: Partial<FollowUpItem>, session: AuthSession | null): Promise<FollowUpItem>;
  complete(id: string, session: AuthSession | null, completionNotes?: string): Promise<FollowUpItem>;
}

export interface IMatchmakerRepository {
  findAll(
    session: AuthSession | null,
    filters?: { status?: 'active' | 'suspended' | 'inactive'; city?: string }
  ): Promise<DetailedExternalMatchmaker[]>;
  findById(id: string, session: AuthSession | null): Promise<DetailedExternalMatchmaker | null>;
  findByCode(code: string, session: AuthSession | null): Promise<DetailedExternalMatchmaker | null>;
  create(
    matchmakerData: Partial<DetailedExternalMatchmaker>,
    session: AuthSession | null
  ): Promise<DetailedExternalMatchmaker>;
  updateStatus(
    id: string,
    status: 'active' | 'suspended' | 'inactive',
    session: AuthSession | null
  ): Promise<DetailedExternalMatchmaker>;
  createAgreement(
    matchmakerId: string,
    agreementData: Partial<PartnerAgreement>,
    session: AuthSession | null
  ): Promise<PartnerAgreement>;
  getAgreements(matchmakerId: string, session: AuthSession | null): Promise<PartnerAgreement[]>;
  attributeReferral(
    matchmakerId: string,
    profileId: string,
    session: AuthSession | null,
    notes?: string
  ): Promise<{ success: boolean; matchmaker: DetailedExternalMatchmaker }>;
}

export type MatchCaseStatus =
  | 'suggested'
  | 'approved_by_nadeem'
  | 'shared_with_parties'
  | 'accepted_by_customer'
  | 'rejected'
  | 'deferred';

export interface MatchCaseRecord {
  id: string;
  caseCode: string;
  profileAId: string;
  profileBId: string;
  status: MatchCaseStatus;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MatchEvaluationRecord {
  id: string;
  matchCaseId: string;
  algorithmVersion: string;
  compatibilityScore: number;
  mandatorySatisfied: boolean;
  criteriaBreakdown: EvaluatedCriterion[];
  evaluationNotes?: string;
  evaluatedAt: string;
}

export interface MatchDecisionRecord {
  id: string;
  matchCaseId: string;
  decision: 'approved' | 'rejected' | 'deferred';
  decidedBy?: string;
  reasonCode: string;
  notes?: string;
  decidedAt: string;
}

export interface IMatchRepository {
  getOrCreateMatchCase(profileAId: string, profileBId: string, session: AuthSession | null): Promise<MatchCaseRecord>;
  findMatchCase(profileAId: string, profileBId: string, session: AuthSession | null): Promise<MatchCaseRecord | null>;
  saveEvaluation(matchCaseId: string, evaluation: MatchEvaluation, session: AuthSession | null): Promise<MatchEvaluationRecord>;
  recordDecision(
    matchCaseId: string,
    decision: 'approved' | 'rejected' | 'deferred',
    reasonCode: string,
    session: AuthSession | null,
    notes?: string
  ): Promise<MatchDecisionRecord>;
  getCaseHistory(matchCaseId: string, session: AuthSession | null): Promise<{
    matchCase: MatchCaseRecord;
    evaluations: MatchEvaluationRecord[];
    decisions: MatchDecisionRecord[];
  } | null>;
}

export interface RegionalLandConventions {
  marlaPerKanal: number;
  sqFtPerMarla: number;
}

export interface AppSettings {
  regionalConventions: RegionalLandConventions;
  updatedAt?: string;
  updatedBy?: string;
}

export interface ISettingsRepository {
  getSettings(session: AuthSession | null): Promise<AppSettings>;
  updateRegionalConventions(
    conventions: RegionalLandConventions,
    session: AuthSession | null
  ): Promise<AppSettings>;
}

export interface IAuditRepository {
  findAll(session: AuthSession | null, limit?: number): Promise<AuditLogItem[]>;
  record(
    logData: Omit<AuditLogItem, 'id' | 'timestamp'>,
    session: AuthSession | null
  ): Promise<AuditLogItem>;
}

// =============================================================================
// In-Memory Demo Storage (Isolated to local development & tests)
// =============================================================================

export const INITIAL_PARTNER_AGREEMENTS: PartnerAgreement[] = [
  {
    id: 'agr-101-01',
    matchmakerId: 'mm-101',
    agreementCode: 'AGR-QUR-2026-01',
    feeType: 'percentage',
    percentageRate: 20,
    effectiveFrom: '2026-01-01',
    termsText: '20% commission on verified registrations and successful match settlements across Multan and Lahore.',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'agr-102-01',
    matchmakerId: 'mm-102',
    agreementCode: 'AGR-KHA-2026-01',
    feeType: 'percentage',
    percentageRate: 25,
    effectiveFrom: '2026-02-01',
    termsText: '25% commission on mutual candidate introductions across Islamabad and Rawalpindi.',
    isActive: true,
    createdAt: '2026-02-01T00:00:00Z',
  },
  {
    id: 'agr-103-01',
    matchmakerId: 'mm-103',
    agreementCode: 'AGR-HUS-2026-01',
    feeType: 'flat_fee',
    flatFeePKR: 50000,
    effectiveFrom: '2026-03-01',
    termsText: 'Fixed flat honorarium of PKR 50,000 per solemnized nikah match in Faisalabad.',
    isActive: true,
    createdAt: '2026-03-01T00:00:00Z',
  },
];

export const INITIAL_DETAILED_MATCHMAKERS: DetailedExternalMatchmaker[] = INITIAL_MATCHMAKERS.map((mm) => {
  const agreements = INITIAL_PARTNER_AGREEMENTS.filter((a) => a.matchmakerId === mm.id);
  const activeAgreement = agreements.find((a) => a.isActive);
  const code = mm.id === 'mm-101' ? 'MM-MUL-01' : mm.id === 'mm-102' ? 'MM-ISB-01' : 'MM-FSD-01';
  const commissionModel = activeAgreement?.feeType || 'percentage';

  return {
    ...mm,
    code,
    email: `${mm.name.toLowerCase().replace(/[^a-z]/g, '')}@example.com`,
    commissionModel,
    agreements,
    activeAgreement,
  };
});

let demoProfilesStore: ProfileRecord[] = [...INITIAL_PROFILES];
let demoTransactionsStore: FinancialTransaction[] = [...INITIAL_TRANSACTIONS];
let demoFollowUpsStore: FollowUpItem[] = [...INITIAL_FOLLOW_UPS];
let demoMatchCasesStore: MatchCaseRecord[] = [];
let demoMatchEvaluationsStore: MatchEvaluationRecord[] = [];
let demoMatchDecisionsStore: MatchDecisionRecord[] = [];
let demoMatchmakersStore: DetailedExternalMatchmaker[] = INITIAL_DETAILED_MATCHMAKERS.map((m) => ({
  ...m,
  agreements: [...m.agreements],
  activeAgreement: m.activeAgreement ? { ...m.activeAgreement } : undefined,
}));
let demoAgreementsStore: PartnerAgreement[] = [...INITIAL_PARTNER_AGREEMENTS];
let demoSettingsStore: AppSettings = {
  regionalConventions: {
    marlaPerKanal: 20,
    sqFtPerMarla: 225,
  },
  updatedAt: '2026-10-24T00:00:00Z',
  updatedBy: 'system',
};
let demoAuditLogsStore: AuditLogItem[] = [...INITIAL_AUDIT_LOGS];

export function resetRepositoriesForTesting(): void {
  demoProfilesStore = [...INITIAL_PROFILES];
  demoTransactionsStore = [...INITIAL_TRANSACTIONS];
  demoFollowUpsStore = [...INITIAL_FOLLOW_UPS];
  demoMatchCasesStore = [];
  demoMatchEvaluationsStore = [];
  demoMatchDecisionsStore = [];
  demoMatchmakersStore = INITIAL_DETAILED_MATCHMAKERS.map((m) => ({
    ...m,
    agreements: [...m.agreements],
    activeAgreement: m.activeAgreement ? { ...m.activeAgreement } : undefined,
  }));
  demoAgreementsStore = [...INITIAL_PARTNER_AGREEMENTS];
  demoSettingsStore = {
    regionalConventions: {
      marlaPerKanal: 20,
      sqFtPerMarla: 225,
    },
    updatedAt: '2026-10-24T00:00:00Z',
    updatedBy: 'system',
  };
  demoAuditLogsStore = [...INITIAL_AUDIT_LOGS];
}

// =============================================================================
// Profile Repository Implementation
// =============================================================================

class ProfileRepositoryImpl implements IProfileRepository {
  async findById(id: string, session: AuthSession | null): Promise<ProfileRecord | null> {
    const config = getClientConfig();
    const viewerRole: Role = session?.isAuthenticated && session.user ? session.user.role : 'public';

    if (config.mode === 'backend') {
      const client = getSupabaseClient();
      if (!client) throw new Error('BACKEND_NOT_CONFIGURED');

      const { data, error } = await client
        .from('profiles')
        .select(`
          *,
          profile_preferences (*),
          profile_siblings (*),
          profile_property_details (*),
          profile_photos (*)
        `)
        .eq('reference_code', id)
        .single();

      if (error || !data) return null;

      const row = data as unknown as ProfileRow;
      const nested = {
        preferences: data.profile_preferences?.[0] || undefined,
        siblings: data.profile_siblings || [],
        property: data.profile_property_details?.[0] || undefined,
        photoUrl: data.profile_photos?.[0]?.storage_path || '',
      };

      const dto = profileRowToDTO(row, nested);
      const isOwner = session?.user?.id === dto.id || session?.user?.email === dto.contactEmail;
      return sanitizeProfileForRole(dto, viewerRole, isOwner);
    }

    // Demo Mode
    const found = demoProfilesStore.find((p) => p.id === id);
    if (!found) return null;

    const isOwner = session?.user?.id === found.id || session?.user?.email === found.contactEmail;
    return sanitizeProfileForRole(found, viewerRole, isOwner);
  }

  async findAll(session: AuthSession | null, filters?: ProfileFilters): Promise<ProfileRecord[]> {
    const config = getClientConfig();
    const viewerRole: Role = session?.isAuthenticated && session.user ? session.user.role : 'public';

    if (config.mode === 'backend') {
      const client = getSupabaseClient();
      if (!client) throw new Error('BACKEND_NOT_CONFIGURED');

      let query = client
        .from('profiles')
        .select(`
          *,
          profile_preferences (*),
          profile_siblings (*),
          profile_property_details (*),
          profile_photos (*)
        `);

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters?.gender && filters.gender !== 'all') {
        query = query.eq('gender', filters.gender);
      }
      if (filters?.city && filters.city !== 'all') {
        query = query.ilike('current_city', `%${filters.city}%`);
      }

      const { data, error } = await query;
      if (error || !data) return [];

      return data.map((d: any) => {
        const row = d as ProfileRow;
        const nested = {
          preferences: d.profile_preferences?.[0] || undefined,
          siblings: d.profile_siblings || [],
          property: d.profile_property_details?.[0] || undefined,
          photoUrl: d.profile_photos?.[0]?.storage_path || '',
        };
        const dto = profileRowToDTO(row, nested);
        const isOwner = session?.user?.id === dto.id || session?.user?.email === dto.contactEmail;
        return sanitizeProfileForRole(dto, viewerRole, isOwner);
      });
    }

    // Demo Mode
    let list = [...demoProfilesStore];
    if (filters?.status && filters.status !== 'all') {
      list = list.filter((p) => p.status === filters.status);
    }
    if (filters?.gender && filters.gender !== 'all') {
      list = list.filter((p) => p.gender === filters.gender);
    }
    if (filters?.city && filters.city !== 'all') {
      list = list.filter((p) => p.currentCity.toLowerCase() === filters.city!.toLowerCase());
    }

    return list.map((p) => {
      const isOwner = session?.user?.id === p.id || session?.user?.email === p.contactEmail;
      return sanitizeProfileForRole(p, viewerRole, isOwner);
    });
  }

  async create(profileData: Partial<ProfileRecord>, session: AuthSession | null): Promise<ProfileRecord> {
    const isStaff = canAccessRole(session, 'nadeem');
    const isCustomer = session?.isAuthenticated && session.user?.role === 'customer';

    if (!isStaff && !isCustomer) {
      throw new Error('UNAUTHORIZED: Must be signed in as staff or verified customer to register candidate profiles.');
    }

    // Force self-service constraints for customer registration (PROF-03)
    if (!isStaff && isCustomer) {
      profileData.status = 'pending_review';
      profileData.source = 'direct_web';
    }

    const validation = validateProfileInput(profileData);
    if (!validation.valid) {
      throw new Error(`VALIDATION_ERROR: ${validation.errors[0]?.messageEn}`);
    }

    const config = getClientConfig();

    if (config.mode === 'backend') {
      const client = getSupabaseClient();
      if (!client) throw new Error('BACKEND_NOT_CONFIGURED');

      const row = profileDTOToRow(profileData, session?.user?.id);
      const { data, error } = await client.from('profiles').insert(row).select().single();
      if (error || !data) throw new Error(`DATABASE_ERROR: ${error?.message}`);

      // If preferences, property, or siblings were provided, insert into normalized tables
      if (profileData.preferences) {
        await client.from('profile_preferences').insert({
          profile_id: data.id,
          age_min: profileData.preferences.ageMin,
          age_max: profileData.preferences.ageMax,
          religion: profileData.preferences.religion,
          aqeedah: profileData.preferences.aqeedah,
          caste: profileData.preferences.caste,
          criteria_classifications: profileData.preferences.criteriaClassifications || {},
        });
      }

      if (profileData.property) {
        await client.from('profile_property_details').insert({
          profile_id: data.id,
          ownership: profileData.property.ownership,
          property_type: profileData.property.propertyType,
          area_marlas: profileData.property.areaMarlas,
          city: profileData.property.city,
          locality: profileData.property.locality,
          household_arrangement: profileData.property.householdArrangement,
        });
      }

      if (profileData.siblings && profileData.siblings.length > 0) {
        const siblingsRows = profileData.siblings.map((s) => ({
          profile_id: data.id,
          relation: s.relation,
          name: s.name,
          gender: s.relation === 'brother' ? 'male' : 'female',
          age: s.age,
          marital_status: s.maritalStatus,
          occupation: s.occupation,
          children_count: s.childrenCount || 0,
        }));
        await client.from('profile_siblings').insert(siblingsRows);
      }

      return profileRowToDTO(data as ProfileRow, {
        preferences: profileData.preferences,
        property: profileData.property,
        siblings: profileData.siblings,
        photoUrl: profileData.photoUrl,
      });
    }

    // Demo Mode
    const newRefCode = `GLS-${100 + demoProfilesStore.length + 1}`;
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
      photoUrl: profileData.photoUrl || '',
      photoPermissionGranted: profileData.photoPermissionGranted ?? false,
      fatherStatus: profileData.fatherStatus,
      motherStatus: profileData.motherStatus,
      siblings: profileData.siblings || [],
      familyBackgroundNotes: profileData.familyBackgroundNotes || '',
      property: profileData.property || {
        ownership: 'owned',
        propertyType: 'house',
        areaMarlas: 0,
        city: profileData.currentCity!.trim(),
        locality: profileData.residenceArea!.trim(),
        householdArrangement: 'independent',
      },
      preferences: profileData.preferences || ({} as any),
      status: 'pending_review',
      source: isStaff ? (profileData.source || 'walk_in') : 'direct_web',
      assignedMatchmakerId: session?.user?.id || 'usr-nadeem',
      assignedMatchmakerName: session?.user?.displayName || 'Nadeem Ahmed',
      contactPerson: profileData.contactPerson!.trim(),
      contactPhone: profileData.contactPhone!.trim(),
      contactEmail: profileData.contactEmail?.trim(),
      preferredContactMethod: profileData.preferredContactMethod || 'whatsapp',
      createdAt: now,
      updatedAt: now,
      internalNotes: profileData.internalNotes?.trim(),
    };

    demoProfilesStore = [newProfile, ...demoProfilesStore];
    return newProfile;
  }

  async updateStatus(id: string, newStatus: ProfileStatus, session: AuthSession | null): Promise<ProfileRecord> {
    const viewerRole: Role = session?.isAuthenticated && session.user ? session.user.role : 'public';

    if (!canAccessRole(session, 'nadeem')) {
      throw new Error('UNAUTHORIZED: Only bureau staff can update profile lifecycle statuses.');
    }

    const config = getClientConfig();

    if (config.mode === 'backend') {
      const client = getSupabaseClient();
      if (!client) throw new Error('BACKEND_NOT_CONFIGURED');

      // Fetch current profile to check state transition
      const { data: existing, error: fetchErr } = await client
        .from('profiles')
        .select('*')
        .eq('reference_code', id)
        .single();

      if (fetchErr || !existing) throw new Error(`NOT_FOUND: Profile ${id} not found.`);

      const check = canTransitionStatus(existing.status as ProfileStatus, newStatus, viewerRole);
      if (!check.allowed) {
        throw new Error(`INVALID_TRANSITION: ${check.reasonEn}`);
      }

      const { data: updated, error: updateErr } = await client
        .from('profiles')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('reference_code', id)
        .select()
        .single();

      if (updateErr || !updated) throw new Error(`DATABASE_ERROR: ${updateErr?.message}`);

      // Record in profile_status_history
      await client.from('profile_status_history').insert({
        profile_id: existing.id,
        old_status: existing.status,
        new_status: newStatus,
        changed_by: session?.user?.id || null,
        reason_code: 'LIFECYCLE_TRANSITION',
        notes: `Status transitioned from ${existing.status} to ${newStatus}`,
      });

      return profileRowToDTO(updated as ProfileRow);
    }

    // Demo Mode
    const target = demoProfilesStore.find((p) => p.id === id);
    if (!target) throw new Error(`NOT_FOUND: Profile ${id} not found.`);

    const check = canTransitionStatus(target.status, newStatus, viewerRole);
    if (!check.allowed) {
      throw new Error(`INVALID_TRANSITION: ${check.reasonEn}`);
    }

    target.status = newStatus;
    target.updatedAt = new Date().toISOString().split('T')[0];
    return target;
  }
}

// =============================================================================
// Finance Repository Implementation
// =============================================================================

class FinanceRepositoryImpl implements IFinanceRepository {
  async findAll(
    session: AuthSession | null,
    filters?: { matchmakerId?: string; status?: string; type?: string }
  ): Promise<FinancialTransaction[]> {
    if (!canAccessRole(session, 'nadeem')) {
      throw new Error('UNAUTHORIZED: Only bureau staff can access financial records.');
    }

    const config = getClientConfig();

    if (config.mode === 'backend') {
      const client = getSupabaseClient();
      if (!client) throw new Error('BACKEND_NOT_CONFIGURED');

      let query = client
        .from('financial_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.matchmakerId) query = query.eq('matchmaker_id', filters.matchmakerId);
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.type) query = query.eq('transaction_type', filters.type);

      const { data, error } = await query;
      if (error || !data) return [];

      return data.map((d: any) => ({
        id: d.reference_code || d.id,
        matchmakerId: d.matchmaker_id,
        matchmakerName: d.matchmaker_name,
        profileId: d.profile_id || undefined,
        type: d.transaction_type,
        amount: Number(d.amount_pkr),
        status: d.status,
        description: d.description,
        date: d.effective_date,
        reversalOf: d.reversal_of || undefined,
        reversalReason: d.reversal_reason || undefined,
      }));
    }

    let items = [...demoTransactionsStore];
    if (filters?.matchmakerId) items = items.filter((t) => t.matchmakerId === filters.matchmakerId);
    if (filters?.status) items = items.filter((t) => t.status === filters.status);
    if (filters?.type) items = items.filter((t) => t.type === filters.type);
    return items;
  }

  async findById(id: string, session: AuthSession | null): Promise<FinancialTransaction | null> {
    if (!canAccessRole(session, 'nadeem')) {
      throw new Error('UNAUTHORIZED: Only bureau staff can access financial records.');
    }

    const config = getClientConfig();

    if (config.mode === 'backend') {
      const client = getSupabaseClient();
      if (!client) throw new Error('BACKEND_NOT_CONFIGURED');

      const { data, error } = await client
        .from('financial_transactions')
        .select('*')
        .or(`reference_code.eq.${id},id.eq.${id}`)
        .maybeSingle();

      if (error || !data) return null;

      return {
        id: data.reference_code || data.id,
        matchmakerId: data.matchmaker_id,
        matchmakerName: data.matchmaker_name,
        profileId: data.profile_id || undefined,
        type: data.transaction_type,
        amount: Number(data.amount_pkr),
        status: data.status,
        description: data.description,
        date: data.effective_date,
        reversalOf: data.reversal_of || undefined,
        reversalReason: data.reversal_reason || undefined,
      };
    }

    const item = demoTransactionsStore.find((t) => t.id === id);
    return item || null;
  }

  async record(txData: Partial<FinancialTransaction>, session: AuthSession | null): Promise<FinancialTransaction> {
    if (!canAccessRole(session, 'nadeem')) {
      throw new Error('UNAUTHORIZED: Only bureau staff can record financial transactions.');
    }

    const config = getClientConfig();
    const now = new Date().toISOString().split('T')[0];
    const newRef = txData.id || `TXN-${1000 + demoTransactionsStore.length + 1}`;

    const newTx: FinancialTransaction = {
      id: newRef,
      matchmakerId: txData.matchmakerId || 'mm-01',
      matchmakerName: txData.matchmakerName || 'Partner Agency',
      profileId: txData.profileId,
      type: txData.type || 'receivable',
      amount: txData.amount || 0,
      status: txData.status || 'pending',
      description: txData.description || 'Matrimonial introduction commission',
      date: txData.date || now,
    };

    if (config.mode === 'backend') {
      const client = getSupabaseClient();
      if (!client) throw new Error('BACKEND_NOT_CONFIGURED');

      const { data, error } = await client.from('financial_transactions').insert({
        reference_code: newTx.id,
        matchmaker_id: newTx.matchmakerId,
        matchmaker_name: newTx.matchmakerName,
        profile_id: newTx.profileId || null,
        transaction_type: newTx.type,
        amount_pkr: newTx.amount,
        currency: 'PKR',
        status: newTx.status,
        description: newTx.description,
        effective_date: newTx.date,
        created_by: session?.user?.id || null,
      }).select().single();

      if (error || !data) throw new Error(`DATABASE_ERROR: ${error?.message}`);
      return newTx;
    }

    demoTransactionsStore = [newTx, ...demoTransactionsStore];
    return newTx;
  }

  async reverse(id: string, reason: string, session: AuthSession | null): Promise<FinancialTransaction> {
    if (!canAccessRole(session, 'nadeem')) {
      throw new Error('UNAUTHORIZED: Only bureau staff can reverse financial transactions.');
    }

    const config = getClientConfig();

    if (config.mode === 'backend') {
      const client = getSupabaseClient();
      if (!client) throw new Error('BACKEND_NOT_CONFIGURED');

      const { data: original, error: fetchErr } = await client
        .from('financial_transactions')
        .select('*')
        .or(`reference_code.eq.${id},id.eq.${id}`)
        .single();

      if (fetchErr || !original) throw new Error(`NOT_FOUND: Transaction ${id} not found.`);
      if (original.status === 'reversed') throw new Error(`ALREADY_REVERSED: Transaction ${id} has already been reversed.`);

      const reversalRef = `REV-${Date.now().toString().slice(-6)}`;
      const now = new Date().toISOString().split('T')[0];

      const { data: rev, error: revErr } = await client.from('financial_transactions').insert({
        reference_code: reversalRef,
        matchmaker_id: original.matchmaker_id,
        matchmaker_name: original.matchmaker_name,
        profile_id: original.profile_id,
        transaction_type: 'reversal',
        amount_pkr: original.amount_pkr,
        currency: 'PKR',
        status: 'settled',
        reversal_of: original.id,
        reversal_reason: reason.trim(),
        description: `Reversal of ${id}: ${reason.trim()}`,
        effective_date: now,
        created_by: session?.user?.id || null,
      }).select().single();

      if (revErr || !rev) throw new Error(`DATABASE_ERROR: ${revErr?.message}`);

      return {
        id: reversalRef,
        matchmakerId: original.matchmaker_id,
        matchmakerName: original.matchmaker_name,
        profileId: original.profile_id || undefined,
        type: 'reversal',
        amount: Number(original.amount_pkr),
        status: 'settled',
        description: `Reversal of ${id}: ${reason.trim()}`,
        date: now,
        reversalOf: original.reference_code,
        reversalReason: reason.trim(),
      };
    }

    const original = demoTransactionsStore.find((t) => t.id === id);
    if (!original) throw new Error(`NOT_FOUND: Transaction ${id} not found.`);
    if (original.status === 'reversed') throw new Error(`ALREADY_REVERSED: Transaction ${id} has already been reversed.`);

    original.status = 'reversed';

    const reversalRef = `REV-${1000 + demoTransactionsStore.length + 1}`;
    const now = new Date().toISOString().split('T')[0];

    const reversalTx: FinancialTransaction = {
      id: reversalRef,
      matchmakerId: original.matchmakerId,
      matchmakerName: original.matchmakerName,
      profileId: original.profileId,
      type: 'reversal',
      amount: original.amount,
      status: 'settled',
      description: `Reversal of ${id}: ${reason.trim()}`,
      date: now,
      reversalOf: original.id,
      reversalReason: reason.trim(),
    };

    demoTransactionsStore = [reversalTx, ...demoTransactionsStore];
    return reversalTx;
  }

  async getPartnerSummary(matchmakerId: string, session: AuthSession | null): Promise<PartnerLedgerSummary> {
    if (!canAccessRole(session, 'nadeem')) {
      throw new Error('UNAUTHORIZED: Only bureau staff can access partner financial summaries.');
    }
    const all = await this.findAll(session);
    const mmTx = all.map((t) => ({ ...t, currency: 'PKR' as const, createdAt: `${t.date}T10:00:00Z` }));
    const partnerName = all.find((t) => t.matchmakerId === matchmakerId)?.matchmakerName || 'Partner Agency';
    return calculatePartnerLedger(matchmakerId, partnerName, mmTx);
  }

  async reconcile(session: AuthSession | null): Promise<BureauReconciliationSummary> {
    if (!canAccessRole(session, 'nadeem')) {
      throw new Error('UNAUTHORIZED: Only bureau staff can reconcile the financial ledger.');
    }
    const all = await this.findAll(session);
    const ledgerTx = all.map((t) => ({ ...t, currency: 'PKR' as const, createdAt: `${t.date}T10:00:00Z` }));
    return reconcileLedger(ledgerTx);
  }
}

// =============================================================================
// CRM Follow-Up Repository Implementation
// =============================================================================

class CRMRepositoryImpl implements ICRMRepository {
  async findAll(
    session: AuthSession | null,
    filters?: { status?: string; priority?: string; profileId?: string }
  ): Promise<FollowUpItem[]> {
    if (!canAccessRole(session, 'nadeem') && !canAccessRole(session, 'admin')) {
      throw new Error('UNAUTHORIZED: Only bureau staff can access CRM follow-ups.');
    }

    const config = getClientConfig();

    if (config.mode === 'backend') {
      const client = getSupabaseClient();
      if (!client) throw new Error('BACKEND_NOT_CONFIGURED');

      let query = client
        .from('crm_follow_ups')
        .select('*')
        .order('scheduled_date', { ascending: true });

      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.priority) query = query.eq('priority', filters.priority);
      if (filters?.profileId) query = query.eq('profile_id', filters.profileId);

      const { data, error } = await query;
      if (error || !data) return [];

      return data.map((d: any) => ({
        id: d.reference_code || d.id,
        profileId: d.profile_id || '',
        candidateId: d.match_case_id || undefined,
        personName: d.contact_person,
        contactPhone: d.contact_phone,
        type: d.follow_up_type,
        dueDate: d.scheduled_date,
        priority: d.priority,
        status: d.status,
        notes: d.notes || '',
      }));
    }

    let items = [...demoFollowUpsStore];
    if (filters?.status) items = items.filter((f) => f.status === filters.status);
    if (filters?.priority) items = items.filter((f) => f.priority === filters.priority);
    if (filters?.profileId) items = items.filter((f) => f.profileId === filters.profileId);
    return items;
  }

  async findById(id: string, session: AuthSession | null): Promise<FollowUpItem | null> {
    const config = getClientConfig();

    if (config.mode === 'backend') {
      const client = getSupabaseClient();
      if (!client) throw new Error('BACKEND_NOT_CONFIGURED');

      const { data, error } = await client
        .from('crm_follow_ups')
        .select('*')
        .or(`reference_code.eq.${id},id.eq.${id}`)
        .maybeSingle();

      if (error || !data) return null;

      return {
        id: data.reference_code || data.id,
        profileId: data.profile_id || '',
        candidateId: data.match_case_id || undefined,
        personName: data.contact_person,
        contactPhone: data.contact_phone,
        type: data.follow_up_type,
        dueDate: data.scheduled_date,
        priority: data.priority,
        status: data.status,
        notes: data.notes || '',
      };
    }

    const item = demoFollowUpsStore.find((f) => f.id === id);
    return item || null;
  }

  async create(itemData: Partial<FollowUpItem>, session: AuthSession | null): Promise<FollowUpItem> {
    const isProfileCorrection = itemData.type === 'profile_correction';
    const isStaff = canAccessRole(session, 'nadeem') || canAccessRole(session, 'admin');
    const isCustomer = session?.role === 'customer' || (session === null && isProfileCorrection);

    if (!isStaff && !isProfileCorrection && !isCustomer) {
      throw new Error('UNAUTHORIZED: Only bureau staff or candidate representatives can submit follow-up tasks.');
    }

    const config = getClientConfig();
    const newRef = itemData.id || `FU-${100 + demoFollowUpsStore.length + 1}`;
    const now = new Date().toISOString().split('T')[0];

    const newItem: FollowUpItem = {
      id: newRef,
      profileId: itemData.profileId || 'GLS-101',
      candidateId: itemData.candidateId,
      personName: itemData.personName || 'Candidate Representative',
      contactPhone: itemData.contactPhone || '+92 300 0000000',
      type: itemData.type || 'initial_consult',
      dueDate: itemData.dueDate || now,
      priority: itemData.priority || 'medium',
      status: 'pending',
      notes: itemData.notes || '',
    };

    if (config.mode === 'backend') {
      const client = getSupabaseClient();
      if (!client) throw new Error('BACKEND_NOT_CONFIGURED');

      const { data, error } = await client.from('crm_follow_ups').insert({
        reference_code: newItem.id,
        target_type: 'profile',
        contact_person: newItem.personName,
        contact_phone: newItem.contactPhone,
        follow_up_type: newItem.type,
        priority: newItem.priority,
        scheduled_date: newItem.dueDate,
        status: 'pending',
        notes: newItem.notes,
        created_at: new Date().toISOString(),
      }).select().single();

      if (error || !data) throw new Error(`DATABASE_ERROR: ${error?.message}`);
      return newItem;
    }

    demoFollowUpsStore = [newItem, ...demoFollowUpsStore];
    return newItem;
  }

  async complete(
    id: string,
    session: AuthSession | null,
    completionNotes?: string
  ): Promise<FollowUpItem> {
    if (!canAccessRole(session, 'nadeem') && !canAccessRole(session, 'admin')) {
      throw new Error('UNAUTHORIZED: Only bureau staff can complete CRM follow-ups.');
    }

    const config = getClientConfig();

    if (config.mode === 'backend') {
      const client = getSupabaseClient();
      if (!client) throw new Error('BACKEND_NOT_CONFIGURED');

      // Idempotency: return existing completed item
      const existing = await this.findById(id, session);
      if (existing && existing.status === 'completed') {
        return existing;
      }

      const now = new Date().toISOString();
      const updatedNotes = completionNotes
        ? existing?.notes
          ? `${existing.notes}\n[Resolution: ${completionNotes}]`
          : completionNotes
        : existing?.notes;

      const { data, error } = await client
        .from('crm_follow_ups')
        .update({
          status: 'completed',
          completed_at: now,
          completed_by: session?.user?.id || null,
          notes: updatedNotes,
        })
        .or(`reference_code.eq.${id},id.eq.${id}`)
        .select()
        .single();

      if (error || !data) throw new Error(`DATABASE_ERROR: ${error?.message}`);

      return {
        id: data.reference_code || data.id,
        profileId: data.profile_id || '',
        candidateId: data.match_case_id || undefined,
        personName: data.contact_person,
        contactPhone: data.contact_phone,
        type: data.follow_up_type,
        dueDate: data.scheduled_date,
        priority: data.priority,
        status: 'completed',
        notes: data.notes || '',
      };
    }

    const item = demoFollowUpsStore.find((f) => f.id === id);
    if (!item) throw new Error(`NOT_FOUND: Follow-up ${id} not found.`);

    if (item.status === 'completed') {
      return item; // Idempotent
    }

    item.status = 'completed';
    if (completionNotes) {
      item.notes = item.notes ? `${item.notes}\n[Resolution: ${completionNotes}]` : completionNotes;
    }
    return item;
  }
}

// =============================================================================
// Matchmaker Repository Implementation (CRM-02)
// =============================================================================

class MatchmakerRepositoryImpl implements IMatchmakerRepository {
  async findAll(
    session: AuthSession | null,
    filters?: { status?: 'active' | 'suspended' | 'inactive'; city?: string }
  ): Promise<DetailedExternalMatchmaker[]> {
    if (!canAccessRole(session, 'nadeem') && !canAccessRole(session, 'admin')) {
      throw new Error('UNAUTHORIZED: Only bureau staff can access partner matchmakers.');
    }

    const config = getClientConfig();

    if (config.mode === 'backend') {
      const client = getSupabaseClient();
      if (!client) throw new Error('BACKEND_NOT_CONFIGURED');

      let query = client
        .from('external_matchmakers')
        .select(`
          *,
          matchmaker_agreements (*)
        `)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.city) {
        query = query.ilike('city', `%${filters.city}%`);
      }

      const { data, error } = await query;
      if (error || !data) return [];

      return data.map((d: any) => {
        const agreements: PartnerAgreement[] = (d.matchmaker_agreements || []).map((a: any) => ({
          id: a.id,
          matchmakerId: a.matchmaker_id,
          agreementCode: a.agreement_code,
          feeType: a.fee_type,
          percentageRate: a.percentage_rate ? Number(a.percentage_rate) : undefined,
          flatFeePKR: a.flat_fee_pkr ? Number(a.flat_fee_pkr) : undefined,
          effectiveFrom: a.effective_from,
          effectiveTo: a.effective_to || undefined,
          termsText: a.terms_text,
          isActive: a.is_active,
          createdAt: a.created_at,
        }));
        const activeAgreement = agreements.find((a) => a.isActive);

        return {
          id: d.code || d.id,
          code: d.code,
          name: d.contact_person,
          agencyName: d.agency_name,
          city: d.city,
          phone: d.phone,
          email: d.email || undefined,
          status: d.status,
          commissionModel: d.commission_model,
          profilesReferredCount: d.referral_count || 0,
          successfulMatchesCount: d.terms_json?.successfulMatchesCount || 0,
          outstandingBalancePKR: d.terms_json?.outstandingBalancePKR || 0,
          commissionRatePercent: activeAgreement?.percentageRate || 20,
          termsJson: d.terms_json,
          agreements,
          activeAgreement,
        };
      });
    }

    // Demo Mode
    let items = [...demoMatchmakersStore];
    if (filters?.status) {
      items = items.filter((m) => m.status === filters.status);
    }
    if (filters?.city) {
      items = items.filter((m) => m.city.toLowerCase().includes(filters.city!.toLowerCase()));
    }
    return items;
  }

  async findById(id: string, session: AuthSession | null): Promise<DetailedExternalMatchmaker | null> {
    if (!canAccessRole(session, 'nadeem') && !canAccessRole(session, 'admin')) {
      throw new Error('UNAUTHORIZED: Only bureau staff can access partner matchmakers.');
    }

    const all = await this.findAll(session);
    const found = all.find((m) => m.id === id || m.code === id);
    return found || null;
  }

  async findByCode(code: string, session: AuthSession | null): Promise<DetailedExternalMatchmaker | null> {
    return this.findById(code, session);
  }

  async create(
    matchmakerData: Partial<DetailedExternalMatchmaker>,
    session: AuthSession | null
  ): Promise<DetailedExternalMatchmaker> {
    if (!canAccessRole(session, 'nadeem') && !canAccessRole(session, 'admin')) {
      throw new Error('UNAUTHORIZED: Only bureau staff can register partner matchmakers.');
    }

    const config = getClientConfig();
    const id = matchmakerData.id || `mm-${100 + demoMatchmakersStore.length + 1}`;
    const code =
      matchmakerData.code ||
      `MM-${matchmakerData.city?.slice(0, 3).toUpperCase() || 'GEN'}-${Math.floor(10 + Math.random() * 90)}`;
    const now = new Date().toISOString();

    const newMatchmaker: DetailedExternalMatchmaker = {
      id,
      code,
      name: matchmakerData.name || 'New Matchmaker',
      agencyName: matchmakerData.agencyName || 'Independent Bureau',
      city: matchmakerData.city || 'Lahore',
      phone: matchmakerData.phone || '+92 300 0000000',
      email: matchmakerData.email,
      status: matchmakerData.status || 'active',
      commissionModel: matchmakerData.commissionModel || 'percentage',
      profilesReferredCount: 0,
      successfulMatchesCount: 0,
      outstandingBalancePKR: 0,
      commissionRatePercent: matchmakerData.commissionRatePercent || 20,
      agreements: [],
    };

    if (config.mode === 'backend') {
      const client = getSupabaseClient();
      if (!client) throw new Error('BACKEND_NOT_CONFIGURED');

      const { data, error } = await client
        .from('external_matchmakers')
        .insert({
          code: newMatchmaker.code,
          agency_name: newMatchmaker.agencyName,
          contact_person: newMatchmaker.name,
          phone: newMatchmaker.phone,
          email: newMatchmaker.email || null,
          city: newMatchmaker.city,
          status: newMatchmaker.status,
          commission_model: newMatchmaker.commissionModel,
          referral_count: 0,
        })
        .select()
        .single();

      if (error || !data) throw new Error(`DATABASE_ERROR: ${error?.message}`);
      return {
        ...newMatchmaker,
        id: data.id,
      };
    }

    demoMatchmakersStore.push(newMatchmaker);
    return newMatchmaker;
  }

  async updateStatus(
    id: string,
    status: 'active' | 'suspended' | 'inactive',
    session: AuthSession | null
  ): Promise<DetailedExternalMatchmaker> {
    if (!canAccessRole(session, 'nadeem') && !canAccessRole(session, 'admin')) {
      throw new Error('UNAUTHORIZED: Only bureau staff can update partner status.');
    }

    const config = getClientConfig();

    if (config.mode === 'backend') {
      const client = getSupabaseClient();
      if (!client) throw new Error('BACKEND_NOT_CONFIGURED');

      const { data, error } = await client
        .from('external_matchmakers')
        .update({ status, updated_at: new Date().toISOString() })
        .or(`id.eq.${id},code.eq.${id}`)
        .select()
        .single();

      if (error || !data) throw new Error(`DATABASE_ERROR: ${error?.message}`);
      return (await this.findById(id, session))!;
    }

    const item = demoMatchmakersStore.find((m) => m.id === id || m.code === id);
    if (!item) throw new Error(`NOT_FOUND: External matchmaker '${id}' not found.`);

    item.status = status;
    return item;
  }

  async createAgreement(
    matchmakerId: string,
    agreementData: Partial<PartnerAgreement>,
    session: AuthSession | null
  ): Promise<PartnerAgreement> {
    if (!canAccessRole(session, 'nadeem') && !canAccessRole(session, 'admin')) {
      throw new Error('UNAUTHORIZED: Only bureau staff can create partner agreements.');
    }

    const config = getClientConfig();
    const mm = await this.findById(matchmakerId, session);
    if (!mm) throw new Error(`NOT_FOUND: External matchmaker '${matchmakerId}' not found.`);

    const now = new Date().toISOString();
    const agreementCode =
      agreementData.agreementCode ||
      `AGR-${mm.code.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now().toString().slice(-4)}`;

    const newAgreement: PartnerAgreement = {
      id: generateCryptoUUID(),
      matchmakerId: mm.id,
      agreementCode,
      feeType: agreementData.feeType || 'percentage',
      percentageRate: agreementData.percentageRate,
      flatFeePKR: agreementData.flatFeePKR,
      tieredRulesJson: agreementData.tieredRulesJson,
      effectiveFrom: agreementData.effectiveFrom || now.split('T')[0],
      effectiveTo: agreementData.effectiveTo,
      termsText: agreementData.termsText || 'Standard collaborative matchmaking agreement.',
      isActive: agreementData.isActive !== false,
      createdAt: now,
    };

    if (config.mode === 'backend') {
      const client = getSupabaseClient();
      if (!client) throw new Error('BACKEND_NOT_CONFIGURED');

      // If active, supersede previous active agreements
      if (newAgreement.isActive) {
        await client
          .from('matchmaker_agreements')
          .update({ is_active: false })
          .eq('matchmaker_id', mm.id);
      }

      const { data, error } = await client
        .from('matchmaker_agreements')
        .insert({
          matchmaker_id: mm.id,
          agreement_code: newAgreement.agreementCode,
          fee_type: newAgreement.feeType,
          percentage_rate: newAgreement.percentageRate || null,
          flat_fee_pkr: newAgreement.flatFeePKR || null,
          effective_from: newAgreement.effectiveFrom,
          effective_to: newAgreement.effectiveTo || null,
          terms_text: newAgreement.termsText,
          is_active: newAgreement.isActive,
        })
        .select()
        .single();

      if (error || !data) throw new Error(`DATABASE_ERROR: ${error?.message}`);
      return newAgreement;
    }

    // Demo Mode: supersede previous active agreements for this matchmaker
    if (newAgreement.isActive) {
      demoAgreementsStore.forEach((a) => {
        if (a.matchmakerId === mm.id) {
          a.isActive = false;
        }
      });
      mm.agreements.forEach((a) => {
        a.isActive = false;
      });
    }

    demoAgreementsStore.push(newAgreement);
    mm.agreements.unshift(newAgreement);
    if (newAgreement.isActive) {
      mm.activeAgreement = newAgreement;
      mm.commissionModel = newAgreement.feeType;
      if (newAgreement.percentageRate) {
        mm.commissionRatePercent = newAgreement.percentageRate;
      }
    }

    return newAgreement;
  }

  async getAgreements(matchmakerId: string, session: AuthSession | null): Promise<PartnerAgreement[]> {
    if (!canAccessRole(session, 'nadeem') && !canAccessRole(session, 'admin')) {
      throw new Error('UNAUTHORIZED: Only bureau staff can view partner agreements.');
    }

    const config = getClientConfig();

    if (config.mode === 'backend') {
      const client = getSupabaseClient();
      if (!client) throw new Error('BACKEND_NOT_CONFIGURED');

      const { data, error } = await client
        .from('matchmaker_agreements')
        .select('*')
        .eq('matchmaker_id', matchmakerId)
        .order('created_at', { ascending: false });

      if (error || !data) return [];
      return data.map((a: any) => ({
        id: a.id,
        matchmakerId: a.matchmaker_id,
        agreementCode: a.agreement_code,
        feeType: a.fee_type,
        percentageRate: a.percentage_rate ? Number(a.percentage_rate) : undefined,
        flatFeePKR: a.flat_fee_pkr ? Number(a.flat_fee_pkr) : undefined,
        effectiveFrom: a.effective_from,
        effectiveTo: a.effective_to || undefined,
        termsText: a.terms_text,
        isActive: a.is_active,
        createdAt: a.created_at,
      }));
    }

    return demoAgreementsStore
      .filter((a) => a.matchmakerId === matchmakerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async attributeReferral(
    matchmakerId: string,
    profileId: string,
    session: AuthSession | null,
    notes?: string
  ): Promise<{ success: boolean; matchmaker: DetailedExternalMatchmaker }> {
    if (!canAccessRole(session, 'nadeem') && !canAccessRole(session, 'admin')) {
      throw new Error('UNAUTHORIZED: Only bureau staff can attribute profile referrals.');
    }

    const matchmaker = await this.findById(matchmakerId, session);
    if (!matchmaker) {
      throw new Error(`NOT_FOUND: External matchmaker '${matchmakerId}' not found.`);
    }

    if (matchmaker.status !== 'active') {
      throw new Error(`MATCHMAKER_INACTIVE: Cannot attribute profile to inactive matchmaker '${matchmaker.name}'.`);
    }

    const config = getClientConfig();

    if (config.mode === 'backend') {
      const client = getSupabaseClient();
      if (!client) throw new Error('BACKEND_NOT_CONFIGURED');

      await client
        .from('external_matchmakers')
        .update({
          referral_count: matchmaker.profilesReferredCount + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', matchmaker.id);
    }

    matchmaker.profilesReferredCount += 1;
    return { success: true, matchmaker };
  }
}

// =============================================================================
// Match Repository Implementation (MATCH-03)
// =============================================================================

class MatchRepositoryImpl implements IMatchRepository {
  async getOrCreateMatchCase(
    profileAId: string,
    profileBId: string,
    session: AuthSession | null
  ): Promise<MatchCaseRecord> {
    if (profileAId === profileBId) {
      throw new Error('SELF_PAIR_PROHIBITED: A profile cannot be matched with itself.');
    }

    const config = getClientConfig();

    if (config.mode === 'backend') {
      const client = getSupabaseClient();
      if (!client) throw new Error('BACKEND_NOT_CONFIGURED');

      const { data: existing, error: findErr } = await client
        .from('match_cases')
        .select('*')
        .or(`and(profile_a_id.eq.${profileAId},profile_b_id.eq.${profileBId}),and(profile_a_id.eq.${profileBId},profile_b_id.eq.${profileAId})`)
        .maybeSingle();

      if (!findErr && existing) {
        return {
          id: existing.id,
          caseCode: existing.case_code,
          profileAId: existing.profile_a_id,
          profileBId: existing.profile_b_id,
          status: existing.status,
          createdBy: existing.created_by || undefined,
          createdAt: existing.created_at,
          updatedAt: existing.updated_at,
        };
      }

      const caseCode = `MC-${profileAId.slice(-4)}-${profileBId.slice(-4)}-${Math.floor(100 + Math.random() * 900)}`;
      const { data: created, error: insertErr } = await client
        .from('match_cases')
        .insert({
          case_code: caseCode,
          profile_a_id: profileAId,
          profile_b_id: profileBId,
          status: 'suggested',
          created_by: session?.user?.id || null,
        })
        .select('*')
        .single();

      if (insertErr || !created) {
        throw new Error(`DB_INSERT_FAILED: ${insertErr?.message || 'Could not create match case.'}`);
      }

      return {
        id: created.id,
        caseCode: created.case_code,
        profileAId: created.profile_a_id,
        profileBId: created.profile_b_id,
        status: created.status,
        createdBy: created.created_by || undefined,
        createdAt: created.created_at,
        updatedAt: created.updated_at,
      };
    }

    // Demo Mode
    const existing = demoMatchCasesStore.find(
      (m) =>
        (m.profileAId === profileAId && m.profileBId === profileBId) ||
        (m.profileAId === profileBId && m.profileBId === profileAId)
    );

    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const newCase: MatchCaseRecord = {
      id: generateCryptoUUID(),
      caseCode: `MC-${profileAId.slice(-4)}-${profileBId.slice(-4)}-${Math.floor(100 + Math.random() * 900)}`,
      profileAId,
      profileBId,
      status: 'suggested',
      createdBy: session?.user?.id,
      createdAt: now,
      updatedAt: now,
    };

    demoMatchCasesStore.push(newCase);
    return newCase;
  }

  async findMatchCase(
    profileAId: string,
    profileBId: string,
    session: AuthSession | null
  ): Promise<MatchCaseRecord | null> {
    const config = getClientConfig();

    if (config.mode === 'backend') {
      const client = getSupabaseClient();
      if (!client) throw new Error('BACKEND_NOT_CONFIGURED');

      const { data, error } = await client
        .from('match_cases')
        .select('*')
        .or(`and(profile_a_id.eq.${profileAId},profile_b_id.eq.${profileBId}),and(profile_a_id.eq.${profileBId},profile_b_id.eq.${profileAId})`)
        .maybeSingle();

      if (error || !data) return null;

      return {
        id: data.id,
        caseCode: data.case_code,
        profileAId: data.profile_a_id,
        profileBId: data.profile_b_id,
        status: data.status,
        createdBy: data.created_by || undefined,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    }

    const found = demoMatchCasesStore.find(
      (m) =>
        (m.profileAId === profileAId && m.profileBId === profileBId) ||
        (m.profileAId === profileBId && m.profileBId === profileAId)
    );

    return found || null;
  }

  async saveEvaluation(
    matchCaseId: string,
    evaluation: MatchEvaluation,
    session: AuthSession | null
  ): Promise<MatchEvaluationRecord> {
    const config = getClientConfig();

    if (config.mode === 'backend') {
      const client = getSupabaseClient();
      if (!client) throw new Error('BACKEND_NOT_CONFIGURED');

      const { data, error } = await client
        .from('match_evaluations')
        .insert({
          match_case_id: matchCaseId,
          algorithm_version: evaluation.algorithmVersion,
          compatibility_score: evaluation.overallScore,
          mandatory_satisfied: evaluation.isMandatorySatisfied,
          criteria_breakdown: evaluation.criteria,
          evaluation_notes: evaluation.summaryEn,
          evaluated_at: evaluation.evaluatedAt || new Date().toISOString(),
        })
        .select('*')
        .single();

      if (error || !data) {
        throw new Error(`DB_INSERT_FAILED: ${error?.message || 'Could not save evaluation.'}`);
      }

      return {
        id: data.id,
        matchCaseId: data.match_case_id,
        algorithmVersion: data.algorithm_version,
        compatibilityScore: data.compatibility_score,
        mandatorySatisfied: data.mandatory_satisfied,
        criteriaBreakdown: data.criteria_breakdown,
        evaluationNotes: data.evaluation_notes || undefined,
        evaluatedAt: data.evaluated_at,
      };
    }

    const newEval: MatchEvaluationRecord = {
      id: generateCryptoUUID(),
      matchCaseId,
      algorithmVersion: evaluation.algorithmVersion,
      compatibilityScore: evaluation.overallScore,
      mandatorySatisfied: evaluation.isMandatorySatisfied,
      criteriaBreakdown: evaluation.criteria,
      evaluationNotes: evaluation.summaryEn,
      evaluatedAt: evaluation.evaluatedAt || new Date().toISOString(),
    };

    demoMatchEvaluationsStore.push(newEval);
    return newEval;
  }

  async recordDecision(
    matchCaseId: string,
    decision: 'approved' | 'rejected' | 'deferred',
    reasonCode: string,
    session: AuthSession | null,
    notes?: string
  ): Promise<MatchDecisionRecord> {
    if (!canAccessRole(session, 'nadeem') && !canAccessRole(session, 'admin')) {
      throw new Error('UNAUTHORIZED: Only bureau staff may record match review decisions.');
    }

    const config = getClientConfig();

    if (config.mode === 'backend') {
      const client = getSupabaseClient();
      if (!client) throw new Error('BACKEND_NOT_CONFIGURED');

      if (decision === 'approved') {
        const { data: latestEval } = await client
          .from('match_evaluations')
          .select('mandatory_satisfied')
          .eq('match_case_id', matchCaseId)
          .order('evaluated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestEval && !latestEval.mandatory_satisfied) {
          throw new Error('CANNOT_APPROVE_INELIGIBLE_MATCH: Mandatory criteria violated.');
        }
      }

      const { data: decisionRow, error: decErr } = await client
        .from('match_decisions')
        .insert({
          match_case_id: matchCaseId,
          decision,
          decided_by: session?.user?.id || null,
          reason_code: reasonCode,
          notes: notes?.trim() || null,
        })
        .select('*')
        .single();

      if (decErr || !decisionRow) {
        throw new Error(`DB_INSERT_FAILED: ${decErr?.message || 'Could not record decision.'}`);
      }

      const newCaseStatus =
        decision === 'approved'
          ? 'approved_by_nadeem'
          : decision === 'rejected'
          ? 'rejected'
          : 'deferred';

      await client
        .from('match_cases')
        .update({ status: newCaseStatus, updated_at: new Date().toISOString() })
        .eq('id', matchCaseId);

      return {
        id: decisionRow.id,
        matchCaseId: decisionRow.match_case_id,
        decision: decisionRow.decision,
        decidedBy: decisionRow.decided_by || undefined,
        reasonCode: decisionRow.reason_code,
        notes: decisionRow.notes || undefined,
        decidedAt: decisionRow.decided_at,
      };
    }

    // Demo Mode
    const matchCase = demoMatchCasesStore.find((m) => m.id === matchCaseId);
    if (!matchCase) {
      throw new Error(`NOT_FOUND: Match case ${matchCaseId} not found.`);
    }

    if (decision === 'approved') {
      const latestEval = demoMatchEvaluationsStore
        .filter((e) => e.matchCaseId === matchCaseId)
        .slice(-1)[0];

      if (latestEval && !latestEval.mandatorySatisfied) {
        throw new Error('CANNOT_APPROVE_INELIGIBLE_MATCH: Mandatory criteria violated.');
      }
    }

    const now = new Date().toISOString();
    const newDecision: MatchDecisionRecord = {
      id: generateCryptoUUID(),
      matchCaseId,
      decision,
      decidedBy: session?.user?.id || session?.user?.email || 'nadeem@gulistan.pk',
      reasonCode,
      notes: notes?.trim() || undefined,
      decidedAt: now,
    };

    demoMatchDecisionsStore.push(newDecision);

    matchCase.status =
      decision === 'approved'
        ? 'approved_by_nadeem'
        : decision === 'rejected'
        ? 'rejected'
        : 'deferred';
    matchCase.updatedAt = now;

    return newDecision;
  }

  async getCaseHistory(
    matchCaseId: string,
    session: AuthSession | null
  ): Promise<{
    matchCase: MatchCaseRecord;
    evaluations: MatchEvaluationRecord[];
    decisions: MatchDecisionRecord[];
  } | null> {
    const config = getClientConfig();

    if (config.mode === 'backend') {
      const client = getSupabaseClient();
      if (!client) throw new Error('BACKEND_NOT_CONFIGURED');

      const { data: cData, error: cErr } = await client
        .from('match_cases')
        .select('*')
        .eq('id', matchCaseId)
        .maybeSingle();

      if (cErr || !cData) return null;

      const { data: eData } = await client
        .from('match_evaluations')
        .select('*')
        .eq('match_case_id', matchCaseId)
        .order('evaluated_at', { ascending: true });

      const { data: dData } = await client
        .from('match_decisions')
        .select('*')
        .eq('match_case_id', matchCaseId)
        .order('decided_at', { ascending: true });

      return {
        matchCase: {
          id: cData.id,
          caseCode: cData.case_code,
          profileAId: cData.profile_a_id,
          profileBId: cData.profile_b_id,
          status: cData.status,
          createdBy: cData.created_by || undefined,
          createdAt: cData.created_at,
          updatedAt: cData.updated_at,
        },
        evaluations: (eData || []).map((e) => ({
          id: e.id,
          matchCaseId: e.match_case_id,
          algorithmVersion: e.algorithm_version,
          compatibilityScore: e.compatibility_score,
          mandatorySatisfied: e.mandatory_satisfied,
          criteriaBreakdown: e.criteria_breakdown,
          evaluationNotes: e.evaluation_notes || undefined,
          evaluatedAt: e.evaluated_at,
        })),
        decisions: (dData || []).map((d) => ({
          id: d.id,
          matchCaseId: d.match_case_id,
          decision: d.decision,
          decidedBy: d.decided_by || undefined,
          reasonCode: d.reason_code,
          notes: d.notes || undefined,
          decidedAt: d.decided_at,
        })),
      };
    }

    const matchCase = demoMatchCasesStore.find((m) => m.id === matchCaseId);
    if (!matchCase) return null;

    const evaluations = demoMatchEvaluationsStore.filter((e) => e.matchCaseId === matchCaseId);
    const decisions = demoMatchDecisionsStore.filter((d) => d.matchCaseId === matchCaseId);

    return {
      matchCase,
      evaluations,
      decisions,
    };
  }
}

class SettingsRepositoryImpl implements ISettingsRepository {
  async getSettings(_session: AuthSession | null): Promise<AppSettings> {
    const config = getClientConfig();
    const supabase = getSupabaseClient();
    if (config.mode === 'backend' && supabase) {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('key', 'regional_conventions')
        .maybeSingle();

      if (error) {
        console.error('[Gulistan] Failed to query app_settings:', error.message);
        throw new Error(`Failed to load app settings: ${error.message}`);
      }

      if (data && data.value_json) {
        return {
          regionalConventions: data.value_json as RegionalLandConventions,
          updatedAt: data.updated_at,
          updatedBy: data.updated_by,
        };
      }
    }
    return {
      regionalConventions: { ...demoSettingsStore.regionalConventions },
      updatedAt: demoSettingsStore.updatedAt,
      updatedBy: demoSettingsStore.updatedBy,
    };
  }

  async updateRegionalConventions(
    conventions: RegionalLandConventions,
    session: AuthSession | null
  ): Promise<AppSettings> {
    if (!session || !session.isAuthenticated || !canAccessRole(session, 'admin')) {
      throw new Error('Unauthorized: Only administrators can update regional land conventions.');
    }

    if (!conventions || typeof conventions.marlaPerKanal !== 'number' || conventions.marlaPerKanal <= 0) {
      throw new Error('Validation failed: marlaPerKanal must be a positive number.');
    }
    if (typeof conventions.sqFtPerMarla !== 'number' || conventions.sqFtPerMarla <= 0) {
      throw new Error('Validation failed: sqFtPerMarla must be a positive number.');
    }

    const config = getClientConfig();
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();
    const actorId = session.user?.id || 'admin';

    if (config.mode === 'backend' && supabase) {
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          key: 'regional_conventions',
          value_json: conventions,
          description: 'Regional land unit calculation conventions',
          updated_at: now,
          updated_by: session.user?.id || null,
        });

      if (error) {
        console.error('[Gulistan] Failed to persist app_settings:', error.message);
        throw new Error(`Failed to persist settings: ${error.message}`);
      }
    }

    demoSettingsStore = {
      regionalConventions: { ...conventions },
      updatedAt: now,
      updatedBy: actorId,
    };

    // Record audit event
    await auditRepository.record(
      {
        actor: session.user?.email || 'admin@gulistan.pk',
        role: 'System Administrator',
        action: 'REGIONAL_CONVENTIONS_UPDATED',
        targetId: 'regional_conventions',
        details: `Updated conventions: ${conventions.marlaPerKanal} Marlas/Kanal, ${conventions.sqFtPerMarla} SqFt/Marla.`,
      },
      session
    );

    return {
      regionalConventions: { ...demoSettingsStore.regionalConventions },
      updatedAt: demoSettingsStore.updatedAt,
      updatedBy: demoSettingsStore.updatedBy,
    };
  }
}

class AuditRepositoryImpl implements IAuditRepository {
  async findAll(session: AuthSession | null, limit: number = 100): Promise<AuditLogItem[]> {
    if (!session || !session.isAuthenticated || (session.role !== 'admin' && session.role !== 'nadeem')) {
      throw new Error('Unauthorized: Audit logs can only be inspected by authorized administrative or matchmaker staff.');
    }

    const config = getClientConfig();
    const supabase = getSupabaseClient();
    if (config.mode === 'backend' && supabase) {
      const { data, error } = await supabase
        .from('audit_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[Gulistan] Failed to query audit_events:', error.message);
        throw new Error(`Failed to query audit trail: ${error.message}`);
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        timestamp: row.created_at ? row.created_at.replace('T', ' ').slice(0, 19) : new Date().toISOString().replace('T', ' ').slice(0, 19),
        actor: row.actor_id || 'system',
        role: row.actor_role,
        action: row.action,
        targetId: row.target_id,
        details: row.details || '',
      }));
    }

    return [...demoAuditLogsStore].slice(0, limit);
  }

  async record(
    logData: Omit<AuditLogItem, 'id' | 'timestamp'>,
    session: AuthSession | null
  ): Promise<AuditLogItem> {
    const config = getClientConfig();
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();
    const id = `AUD-${Date.now()}-${generateCryptoUUID().slice(0, 6)}`;
    const actorEmail = session?.user?.email || logData.actor || 'system@gulistan.pk';
    const actorRole = session?.role || logData.role || 'system';

    const item: AuditLogItem = {
      id,
      timestamp: now.replace('T', ' ').slice(0, 19),
      actor: actorEmail,
      role: actorRole,
      action: logData.action,
      targetId: logData.targetId,
      details: logData.details,
    };

    if (config.mode === 'backend' && supabase) {
      const { error } = await supabase.from('audit_events').insert({
        actor_id: session?.user?.id || null,
        actor_role: actorRole,
        action: logData.action,
        target_type: logData.targetId.split('-')[0] || 'entity',
        target_id: logData.targetId,
        details: logData.details,
        created_at: now,
      });

      if (error) {
        console.error('[Gulistan] Failed to insert audit_events:', error.message);
      }
    }

    demoAuditLogsStore = [item, ...demoAuditLogsStore];
    return item;
  }
}

// =============================================================================
// Singleton Instances & Testing Hooks
// =============================================================================

export let profileRepository: IProfileRepository = new ProfileRepositoryImpl();
export let financeRepository: IFinanceRepository = new FinanceRepositoryImpl();
export let crmRepository: ICRMRepository = new CRMRepositoryImpl();
export let matchRepository: IMatchRepository = new MatchRepositoryImpl();
export let matchmakerRepository: IMatchmakerRepository = new MatchmakerRepositoryImpl();
export let settingsRepository: ISettingsRepository = new SettingsRepositoryImpl();
export let auditRepository: IAuditRepository = new AuditRepositoryImpl();

export function setProfileRepositoryForTesting(repo: IProfileRepository): void {
  profileRepository = repo;
}

export function resetProfileRepositoryForTesting(): void {
  profileRepository = new ProfileRepositoryImpl();
}

export function setFinanceRepositoryForTesting(repo: IFinanceRepository): void {
  financeRepository = repo;
}

export function resetFinanceRepositoryForTesting(): void {
  financeRepository = new FinanceRepositoryImpl();
}

export function setCRMRepositoryForTesting(repo: ICRMRepository): void {
  crmRepository = repo;
}

export function resetCRMRepositoryForTesting(): void {
  crmRepository = new CRMRepositoryImpl();
}

export function setMatchRepositoryForTesting(repo: IMatchRepository): void {
  matchRepository = repo;
}

export function resetMatchRepositoryForTesting(): void {
  matchRepository = new MatchRepositoryImpl();
}

export function setMatchmakerRepositoryForTesting(repo: IMatchmakerRepository): void {
  matchmakerRepository = repo;
}

export function resetMatchmakerRepositoryForTesting(): void {
  matchmakerRepository = new MatchmakerRepositoryImpl();
}

export function setSettingsRepositoryForTesting(repo: ISettingsRepository): void {
  settingsRepository = repo;
}

export function resetSettingsRepositoryForTesting(): void {
  settingsRepository = new SettingsRepositoryImpl();
}

export function setAuditRepositoryForTesting(repo: IAuditRepository): void {
  auditRepository = repo;
}

export function resetAuditRepositoryForTesting(): void {
  auditRepository = new AuditRepositoryImpl();
}
