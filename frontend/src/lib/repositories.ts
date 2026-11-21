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
  ReferralAttribution,
  AuditLogItem,
  PartnerPreference,
  MatchRecommendation,
  MigrationBatchRecord,
  MigrationStagedRecord,
  PaginatedResult,
} from '../types';
import { FinancialTransaction } from '../utils/finance';
import { AuthSession, canAccessRole } from './auth';
import { getClientConfig } from './config';
import { getSupabaseClient } from './supabaseClient';
import { MatchEvaluation, EvaluatedCriterion } from './matching';
import { generateCryptoUUID, computeSha256 } from './crypto';
import {
  ProfileRow,
  ProfilePreferencesRow,
  ProfileSiblingRow,
  ProfilePropertyRow,
  profileRowToDTO,
  profileDTOToRow,
  profilePreferencesRowToDTO,
  profilePreferencesDTOToRow,
  profileSiblingDTOToRow,
  profilePropertyDTOToRow,
  enrichPropertyDetails,
  generateReferenceCode,
  sanitizeProfileForRole,
  validateProfileInput,
  canTransitionStatus,
} from './profiles';
import {
  PhotoRecord,
  resolveCandidatePhotoUrl,
  uploadCandidatePhoto,
  executeCandidatePrivacyErasureAsync,
} from './photos';
import {
  AuthorizedDisclosureSnapshot,
  persistShareGrantAsync,
  redeemShareGrantAsync,
  revokeShareGrantAsync,
} from './disclosure';
import {
  INITIAL_PROFILES,
  INITIAL_FOLLOW_UPS,
  INITIAL_TRANSACTIONS,
  INITIAL_MATCHMAKERS,
  INITIAL_AUDIT_LOGS,
  INITIAL_RECOMMENDATIONS,
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
  caste?: string;
  minAge?: number;
  maxAge?: number;
  maritalStatus?: string;
  limit?: number;
  offset?: number;
  cursorCreatedAt?: string;
  cursorId?: string;
  unbounded?: boolean;
}

export interface IProfileRepository {
  findById(id: string, session: AuthSession | null): Promise<ProfileRecord | null>;
  findAll(session: AuthSession | null, filters?: ProfileFilters): Promise<ProfileRecord[]>;
  findPaginated(
    session: AuthSession | null,
    filters?: ProfileFilters
  ): Promise<PaginatedResult<ProfileRecord>>;
  create(profileData: Partial<ProfileRecord>, session: AuthSession | null): Promise<ProfileRecord>;
  updateStatus(id: string, newStatus: ProfileStatus, session: AuthSession | null): Promise<ProfileRecord>;
  updateProfileDetails(
    id: string,
    updates: Partial<ProfileRecord>,
    session: AuthSession | null
  ): Promise<ProfileRecord>;
  updatePreferences(
    id: string,
    preferences: Partial<PartnerPreference>,
    session: AuthSession | null
  ): Promise<PartnerPreference>;
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
  ): Promise<{ success: boolean; matchmaker: DetailedExternalMatchmaker; attribution?: ReferralAttribution }>;
  getReferralAttributions(
    matchmakerId: string,
    session: AuthSession | null
  ): Promise<ReferralAttribution[]>;
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
  profileAUuid?: string;
  profileBUuid?: string;
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
    notes?: string,
    adminOverride?: boolean
  ): Promise<MatchDecisionRecord>;
  getCaseHistory(matchCaseId: string, session: AuthSession | null): Promise<{
    matchCase: MatchCaseRecord;
    evaluations: MatchEvaluationRecord[];
    decisions: MatchDecisionRecord[];
    restoredEvaluation?: MatchEvaluation;
  } | null>;
  getApprovedRecommendationsForCustomer(
    profileId: string,
    session: AuthSession | null
  ): Promise<MatchRecommendation[]>;
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

export interface IPhotoRepository {
  upload(
    profileId: string,
    file: { name: string; size: number; type: string; data?: Blob | ArrayBuffer | Uint8Array | File },
    consentCertified: boolean,
    session: AuthSession | null
  ): Promise<{ success: boolean; photo: PhotoRecord | null; error?: string }>;
  getSignedUrl(storagePath: string, expiresInSeconds?: number): Promise<string>;
  purgeAndErase(
    profileId: string,
    session: AuthSession | null,
    eraseProfile?: boolean
  ): Promise<{ success: boolean; purgedPhotoId: string | null; grantsRevokedCount: number; error?: string }>;
}

export interface IShareGrantRepository {
  createGrant(
    snapshot: AuthorizedDisclosureSnapshot,
    session: AuthSession | null,
    recipientContext?: { recipientType?: string; recipientPhone?: string }
  ): Promise<{ success: boolean; grantId: string; error?: string }>;
  redeemGrant(tokenOrHash: string): Promise<{
    valid: boolean;
    reason?: string;
    snapshot?: AuthorizedDisclosureSnapshot;
    referenceCode?: string;
  }>;
  revokeGrant(
    tokenOrHashOrGrantId: string,
    session: AuthSession | null
  ): Promise<{ success: boolean; error?: string }>;
}

export interface IMigrationRepository {
  createBatch(
    batch: Omit<MigrationBatchRecord, 'id' | 'createdAt'> & { id?: string },
    session: AuthSession | null
  ): Promise<MigrationBatchRecord>;
  findBatchById(batchId: string, session: AuthSession | null): Promise<MigrationBatchRecord | null>;
  findBatchByCode(batchCode: string, session: AuthSession | null): Promise<MigrationBatchRecord | null>;
  findAllBatches(session: AuthSession | null): Promise<MigrationBatchRecord[]>;
  updateBatch(
    batchId: string,
    updates: Partial<MigrationBatchRecord>,
    session: AuthSession | null
  ): Promise<MigrationBatchRecord>;

  createStagedRecords(
    records: Array<Omit<MigrationStagedRecord, 'id'> & { id?: string }>,
    session: AuthSession | null
  ): Promise<MigrationStagedRecord[]>;
  findStagedRecordsByBatch(batchId: string, session: AuthSession | null): Promise<MigrationStagedRecord[]>;
  findStagedRecordById(recordId: string, session: AuthSession | null): Promise<MigrationStagedRecord | null>;
  updateStagedRecord(
    recordId: string,
    updates: Partial<MigrationStagedRecord>,
    session: AuthSession | null
  ): Promise<MigrationStagedRecord>;

  purgeRawContent(batchId: string, session: AuthSession | null): Promise<{ purgedCount: number }>;
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
let demoReferralAttributionsStore: ReferralAttribution[] = [];
let demoMigrationBatchesStore: MigrationBatchRecord[] = [];
let demoStagedRecordsStore: MigrationStagedRecord[] = [];

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
  demoReferralAttributionsStore = [];
  demoMigrationBatchesStore = [];
  demoStagedRecordsStore = [];
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

      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      const query = client
        .from('profiles')
        .select(`
          *,
          profile_preferences (*),
          profile_siblings (*),
          profile_property_details (*),
          profile_photos (*)
        `);

      const { data, error } = await (isUUID ? query.eq('id', id) : query.eq('reference_code', id)).single();

      if (error) {
        if (error.code === 'PGRST116') return null; // zero rows found
        throw new Error(`DATABASE_ERROR: ${error.message}`);
      }
      if (!data) return null;

      const row = data as unknown as ProfileRow;
      const rawPath = data.profile_photos?.[0]?.storage_path || '';
      const photoUrl = rawPath ? await resolveCandidatePhotoUrl(rawPath) : '';
      const nested = {
        preferences: data.profile_preferences?.[0] || undefined,
        siblings: data.profile_siblings || [],
        property: data.profile_property_details?.[0] || undefined,
        photoUrl,
      };

      const dto = profileRowToDTO(row, nested);
      const isOwner = session?.user?.id && (
        session.user.id === dto.accountId ||
        session.user.id === dto.createdBy ||
        session.user.id === dto.databaseId ||
        session.user.id === dto.id ||
        (dto.contactEmail && session.user.email?.toLowerCase() === dto.contactEmail.toLowerCase())
      );
      return sanitizeProfileForRole(dto, viewerRole, !!isOwner);
    }

    // Demo Mode: resolve by reference code or UUID
    const found = demoProfilesStore.find(
      (p) => p.id === id || (p.referenceCode && p.referenceCode === id) || (p.databaseId && p.databaseId === id)
    );
    if (!found) return null;

    const isOwner = session?.user?.id && (
      session.user.id === found.accountId ||
      session.user.id === found.createdBy ||
      session.user.id === found.databaseId ||
      session.user.id === found.id ||
      (found.contactEmail && session.user.email?.toLowerCase() === found.contactEmail.toLowerCase())
    );
    return sanitizeProfileForRole(found, viewerRole, !!isOwner);
  }

  async findPaginated(
    session: AuthSession | null,
    filters?: ProfileFilters
  ): Promise<PaginatedResult<ProfileRecord>> {
    const config = getClientConfig();
    const viewerRole: Role = session?.isAuthenticated && session.user ? session.user.role : 'public';
    const isStaff = canAccessRole(session, 'nadeem') || canAccessRole(session, 'admin');

    const limit = Math.min(Math.max(filters?.limit ?? 20, 1), 100);
    const offset = Math.max(filters?.offset ?? 0, 0);

    if (config.mode === 'backend') {
      const client = getSupabaseClient();
      if (!client) throw new Error('BACKEND_NOT_CONFIGURED');

      // Attempt optimized server RPC if available
      try {
        const { data: rpcData, error: rpcError } = await client.rpc('search_profiles_paginated', {
          p_status: filters?.status && filters.status !== 'all' ? filters.status : null,
          p_gender: filters?.gender && filters.gender !== 'all' ? filters.gender : null,
          p_city: filters?.city && filters.city !== 'all' ? filters.city : null,
          p_caste: filters?.caste && filters.caste !== 'all' ? filters.caste : null,
          p_min_age: filters?.minAge ?? null,
          p_max_age: filters?.maxAge ?? null,
          p_marital_status: filters?.maritalStatus && filters.maritalStatus !== 'all' ? filters.maritalStatus : null,
          p_limit: limit,
          p_offset: offset,
          p_cursor_created_at: filters?.cursorCreatedAt ?? null,
          p_cursor_id: filters?.cursorId ?? null,
        });

        if (!rpcError && rpcData) {
          const rawItems = rpcData.items || [];
          const items: ProfileRecord[] = await Promise.all(
            rawItems.map(async (row: any) => {
              const photoUrl = row.photo_storage_path ? await resolveCandidatePhotoUrl(row.photo_storage_path) : '';
              const isOwner = session?.user?.id && (
                session.user.id === row.id ||
                session.user.id === row.reference_code
              );
              return sanitizeProfileForRole({
                id: row.reference_code || row.id,
                databaseId: row.id,
                referenceCode: row.reference_code,
                fullName: row.full_name,
                displayName: row.full_name,
                gender: row.gender,
                age: row.age,
                height: "5'6\"",
                maritalStatus: row.marital_status,
                religion: row.religion,
                aqeedah: row.aqeedah,
                caste: row.caste,
                education: row.education,
                occupation: row.occupation,
                monthlyIncomePKR: row.monthly_income_pkr || 0,
                currentCity: row.current_city,
                status: row.status,
                createdAt: row.created_at,
                updatedAt: row.created_at,
                photoUrl,
              } as ProfileRecord, viewerRole, !!isOwner);
            })
          );

          return {
            items,
            totalCount: Number(rpcData.total_count || 0),
            limit: Number(rpcData.limit || limit),
            offset: Number(rpcData.offset || offset),
            hasMore: Boolean(rpcData.has_more),
            nextCursor: rpcData.next_cursor || undefined,
          };
        }
      } catch {
        // Fallback to direct PostgREST pagination query below
      }

      // Direct PostgREST query with count: 'exact' and .range()
      let query = client
        .from('profiles')
        .select(`
          *,
          profile_preferences (*),
          profile_siblings (*),
          profile_property_details (*),
          profile_photos (*)
        `, { count: 'exact' });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      } else if (!isStaff) {
        query = query.in('status', ['active', 'introduction_authorized']);
      }
      if (filters?.gender && filters.gender !== 'all') {
        query = query.eq('gender', filters.gender);
      }
      if (filters?.city && filters.city !== 'all') {
        query = query.ilike('current_city', `%${filters.city}%`);
      }
      if (filters?.caste && filters.caste !== 'all') {
        query = query.ilike('caste', `%${filters.caste}%`);
      }
      if (filters?.minAge !== undefined) {
        query = query.gte('age', filters.minAge);
      }
      if (filters?.maxAge !== undefined) {
        query = query.lte('age', filters.maxAge);
      }
      if (filters?.maritalStatus && filters.maritalStatus !== 'all') {
        query = query.eq('marital_status', filters.maritalStatus);
      }

      // Keyset cursor vs offset pagination
      if (filters?.cursorCreatedAt && filters?.cursorId) {
        query = query.or(`created_at.lt.${filters.cursorCreatedAt},and(created_at.eq.${filters.cursorCreatedAt},id.lt.${filters.cursorId})`);
        query = query.order('created_at', { ascending: false }).order('id', { ascending: false }).limit(limit + 1);
      } else {
        query = query.order('created_at', { ascending: false }).order('id', { ascending: false }).range(offset, offset + limit);
      }

      const { data, count, error } = await query;
      if (error) throw new Error(`DATABASE_ERROR: ${error.message}`);
      const rawRows = data || [];
      const hasMore = rawRows.length > limit;
      const pageRows = hasMore ? rawRows.slice(0, limit) : rawRows;

      const items: ProfileRecord[] = await Promise.all(
        pageRows.map(async (d: any) => {
          const row = d as ProfileRow;
          const rawPath = d.profile_photos?.[0]?.storage_path || '';
          const photoUrl = rawPath ? await resolveCandidatePhotoUrl(rawPath) : '';
          const nested = {
            preferences: d.profile_preferences?.[0] || undefined,
            siblings: d.profile_siblings || [],
            property: d.profile_property_details?.[0] || undefined,
            photoUrl,
          };
          const dto = profileRowToDTO(row, nested);
          const isOwner = session?.user?.id && (
            session.user.id === dto.accountId ||
            session.user.id === dto.createdBy ||
            session.user.id === dto.databaseId ||
            session.user.id === dto.id ||
            (dto.contactEmail && session.user.email?.toLowerCase() === dto.contactEmail.toLowerCase())
          );
          return sanitizeProfileForRole(dto, viewerRole, !!isOwner);
        })
      );

      const nextCursor = pageRows.length > 0 ? {
        createdAt: pageRows[pageRows.length - 1].created_at,
        id: pageRows[pageRows.length - 1].id,
      } : undefined;

      return {
        items,
        totalCount: count ?? items.length,
        limit,
        offset,
        hasMore,
        nextCursor,
      };
    }

    // Demo Mode
    let list = [...demoProfilesStore];

    // Status filter
    if (filters?.status && filters.status !== 'all') {
      list = list.filter((p) => p.status === filters.status);
    } else if (!isStaff) {
      list = list.filter((p) => p.status === 'active' || p.status === 'introduction_authorized');
    }

    // Demographic filters
    if (filters?.gender && filters.gender !== 'all') {
      list = list.filter((p) => p.gender === filters.gender);
    }
    if (filters?.city && filters.city !== 'all') {
      list = list.filter((p) => p.currentCity.toLowerCase().includes(filters.city!.toLowerCase()));
    }
    if (filters?.caste && filters.caste !== 'all') {
      list = list.filter((p) => p.caste.toLowerCase().includes(filters.caste!.toLowerCase()));
    }
    if (filters?.minAge !== undefined) {
      list = list.filter((p) => p.age >= filters.minAge!);
    }
    if (filters?.maxAge !== undefined) {
      list = list.filter((p) => p.age <= filters.maxAge!);
    }
    if (filters?.maritalStatus && filters.maritalStatus !== 'all') {
      list = list.filter((p) => p.maritalStatus === filters.maritalStatus);
    }

    // Sort reverse chronological by createdAt, then id
    list.sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      if (timeB !== timeA) return timeB - timeA;
      return (b.databaseId || b.id).localeCompare(a.databaseId || a.id);
    });

    const totalCount = list.length;
    let paginatedList: ProfileRecord[];
    let hasMore = false;

    if (filters?.cursorCreatedAt && filters?.cursorId) {
      const cursorTime = new Date(filters.cursorCreatedAt).getTime();
      const cursorIdx = list.findIndex((p) => {
        const pTime = new Date(p.createdAt || 0).getTime();
        return pTime < cursorTime || (pTime === cursorTime && (p.databaseId || p.id) < filters.cursorId!);
      });
      const sliceStart = cursorIdx >= 0 ? cursorIdx : list.length;
      paginatedList = list.slice(sliceStart, sliceStart + limit);
      hasMore = sliceStart + limit < totalCount;
    } else {
      paginatedList = list.slice(offset, offset + limit);
      hasMore = offset + limit < totalCount;
    }

    const items = paginatedList.map((p) => {
      const isOwner = session?.user?.id && (
        session.user.id === p.accountId ||
        session.user.id === p.createdBy ||
        session.user.id === p.databaseId ||
        session.user.id === p.id ||
        (p.contactEmail && session.user.email?.toLowerCase() === p.contactEmail.toLowerCase())
      );
      return sanitizeProfileForRole(p, viewerRole, !!isOwner);
    });

    const nextCursor = paginatedList.length > 0 ? {
      createdAt: paginatedList[paginatedList.length - 1].createdAt,
      id: paginatedList[paginatedList.length - 1].databaseId || paginatedList[paginatedList.length - 1].id,
    } : undefined;

    return {
      items,
      totalCount,
      limit,
      offset,
      hasMore,
      nextCursor,
    };
  }

  async findAll(session: AuthSession | null, filters?: ProfileFilters): Promise<ProfileRecord[]> {
    // If specific pagination or search bounds are requested, delegate to findPaginated
    if (filters?.limit !== undefined || filters?.offset !== undefined || filters?.cursorCreatedAt || filters?.cursorId || filters?.caste || filters?.minAge || filters?.maxAge || filters?.maritalStatus) {
      const res = await this.findPaginated(session, filters);
      return res.items;
    }

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

      // Bound queries by default (max 100) unless explicit staff unbounded opt-in (remediates P1-19)
      if (!filters?.unbounded) {
        query = query.limit(100);
      }

      const { data, error } = await query;
      if (error) throw new Error(`DATABASE_ERROR: ${error.message}`);
      if (!data) return [];

      return Promise.all(data.map(async (d: any) => {
        const row = d as ProfileRow;
        const rawPath = d.profile_photos?.[0]?.storage_path || '';
        const photoUrl = rawPath ? await resolveCandidatePhotoUrl(rawPath) : '';
        const nested = {
          preferences: d.profile_preferences?.[0] || undefined,
          siblings: d.profile_siblings || [],
          property: d.profile_property_details?.[0] || undefined,
          photoUrl,
        };
        const dto = profileRowToDTO(row, nested);
        const isOwner = session?.user?.id && (
          session.user.id === dto.accountId ||
          session.user.id === dto.createdBy ||
          session.user.id === dto.databaseId ||
          session.user.id === dto.id ||
          (dto.contactEmail && session.user.email?.toLowerCase() === dto.contactEmail.toLowerCase())
        );
        return sanitizeProfileForRole(dto, viewerRole, !!isOwner);
      }));
    }

    // Demo Mode: bound by default (100) unless unbounded
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

    if (!filters?.unbounded && list.length > 100) {
      list = list.slice(0, 100);
    }

    return list.map((p) => {
      const isOwner = session?.user?.id && (
        session.user.id === p.accountId ||
        session.user.id === p.createdBy ||
        session.user.id === p.databaseId ||
        session.user.id === p.id ||
        (p.contactEmail && session.user.email?.toLowerCase() === p.contactEmail.toLowerCase())
      );
      return sanitizeProfileForRole(p, viewerRole, !!isOwner);
    });
  }

  async create(profileData: Partial<ProfileRecord>, session: AuthSession | null): Promise<ProfileRecord> {
    const isStaff = canAccessRole(session, 'nadeem');
    const isCustomer = session?.isAuthenticated && session.user?.role === 'customer';

    if (!isStaff && !isCustomer) {
      throw new Error('UNAUTHORIZED: Must be signed in as staff or verified customer to register candidate profiles.');
    }

    // Force self-service constraints for customer registration (P0-03, P0-15)
    if (!isStaff && isCustomer) {
      profileData.status = 'pending_review';
      profileData.source = 'direct_web';
      profileData.accountId = session?.user?.id;
      profileData.createdBy = session?.user?.id;
    } else if (isStaff) {
      profileData.createdBy = session?.user?.id;
    }

    const validation = validateProfileInput(profileData);
    if (!validation.valid) {
      throw new Error(`VALIDATION_ERROR: ${validation.errors[0]?.messageEn}`);
    }

    const config = getClientConfig();

    if (config.mode === 'backend') {
      const client = getSupabaseClient();
      if (!client) throw new Error('BACKEND_NOT_CONFIGURED');

      const parentRow = profileDTOToRow(profileData, session?.user?.id);
      const prefRow = profileData.preferences ? profilePreferencesDTOToRow(profileData.preferences) : null;
      const propRow = profileData.property ? profilePropertyDTOToRow(profileData.property) : null;
      const sibRows = profileData.siblings && profileData.siblings.length > 0
        ? profileData.siblings.map((s) => profileSiblingDTOToRow(s))
        : null;

      // 1. Try single atomic transactional RPC (P1-13)
      try {
        const { data: bundleData, error: rpcError } = await client.rpc('create_profile_bundle', {
          p_profile: parentRow,
          p_preferences: prefRow,
          p_property: propRow,
          p_siblings: sibRows,
        });

        if (!rpcError && bundleData && bundleData.profile) {
          return profileRowToDTO(bundleData.profile as ProfileRow, {
            preferences: bundleData.preferences || undefined,
            property: bundleData.property || undefined,
            siblings: bundleData.siblings || [],
            photoUrl: profileData.photoUrl,
          });
        }
      } catch {
        // Fall back to direct write with transactional rollback
      }

      // 2. Direct write with rollback on child failure (P1-13)
      const { data: parentData, error: parentError } = await client.from('profiles').insert(parentRow).select().single();
      if (parentError || !parentData) throw new Error(`DATABASE_ERROR: ${parentError?.message}`);

      try {
        if (prefRow) {
          const { error: prefErr } = await client
            .from('profile_preferences')
            .insert({ ...prefRow, profile_id: parentData.id });
          if (prefErr) throw prefErr;
        }

        if (propRow) {
          const { error: propErr } = await client
            .from('profile_property_details')
            .insert({ ...propRow, profile_id: parentData.id });
          if (propErr) throw propErr;
        }

        if (sibRows && sibRows.length > 0) {
          const siblingsPayload = sibRows.map((s) => ({ ...s, profile_id: parentData.id }));
          const { error: sibErr } = await client.from('profile_siblings').insert(siblingsPayload);
          if (sibErr) throw sibErr;
        }
      } catch (childErr: any) {
        // Atomic compensation: delete created parent profile on child insert failure
        await client.from('profiles').delete().eq('id', parentData.id);
        throw new Error(`TRANSACTION_FAILED: Child write failed, parent rolled back: ${childErr?.message || childErr}`);
      }

      return profileRowToDTO(parentData as ProfileRow, {
        preferences: profileData.preferences,
        property: profileData.property,
        siblings: profileData.siblings,
        photoUrl: profileData.photoUrl,
      });
    }

    // Demo Mode
    const newRefCode = generateReferenceCode();
    const demoUUID = `00000000-0000-4000-8000-${Math.random().toString(16).substring(2, 14).padStart(12, '0')}`;
    const now = new Date().toISOString().split('T')[0];

    const newProfile: ProfileRecord = {
      id: newRefCode,
      databaseId: demoUUID,
      referenceCode: newRefCode,
      accountId: isStaff ? (profileData.accountId || undefined) : session?.user?.id,
      createdBy: session?.user?.id,
      fullName: profileData.fullName!.trim(),
      displayName: profileData.displayName?.trim() || profileData.fullName!.trim(),
      gender: profileData.gender!,
      age: profileData.age!,
      dob: profileData.dob,
      height: profileData.height || "5'6\"",
      maritalStatus: profileData.maritalStatus!,
      religion: profileData.religion?.trim() || 'Islam',
      aqeedah: profileData.aqeedah?.trim() || '',
      caste: profileData.caste?.trim() || '',
      subCaste: profileData.subCaste?.trim(),
      education: profileData.education?.trim() || '',
      educationField: profileData.educationField?.trim() || '',
      occupation: profileData.occupation?.trim() || '',
      jobTitle: profileData.jobTitle?.trim() || '',
      companyOrSector: profileData.companyOrSector?.trim(),
      monthlyIncomePKR: profileData.monthlyIncomePKR,
      hometown: profileData.hometown?.trim() || '',
      currentCity: profileData.currentCity?.trim() || '',
      residenceArea: profileData.residenceArea?.trim() || '',
      photoUrl: profileData.photoUrl || '',
      photoPermissionGranted: profileData.photoPermissionGranted ?? false,
      fatherStatus: profileData.fatherStatus,
      motherStatus: profileData.motherStatus,
      siblings: profileData.siblings || [],
      familyBackgroundNotes: profileData.familyBackgroundNotes || '',
      property: profileData.property ? enrichPropertyDetails(profileData.property) : undefined,
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

  async updateProfileDetails(
    id: string,
    updates: Partial<ProfileRecord>,
    session: AuthSession | null
  ): Promise<ProfileRecord> {
    if (!canAccessRole(session, 'nadeem') && !canAccessRole(session, 'admin')) {
      throw new Error('UNAUTHORIZED: Only bureau staff can update profile details.');
    }
    const config = getClientConfig();

    if (config.mode === 'backend') {
      const client = getSupabaseClient();
      if (!client) throw new Error('BACKEND_NOT_CONFIGURED');
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      const matchCol = isUUID ? 'id' : 'reference_code';
      const patch: any = { updated_at: new Date().toISOString() };
      if (updates.caste !== undefined) patch.caste = updates.caste;
      if (updates.education !== undefined) patch.education_level = updates.education;
      if (updates.occupation !== undefined) patch.occupation = updates.occupation;
      if (updates.internalNotes !== undefined) patch.notes = updates.internalNotes;
      if (updates.contactPhone !== undefined) patch.contact_phone = updates.contactPhone;

      const { data, error } = await client.from('profiles').update(patch).eq(matchCol, id).select().single();
      if (error) throw new Error(`DATABASE_ERROR: ${error.message}`);
      return profileRowToDTO(data as ProfileRow);
    }

    const idx = demoProfilesStore.findIndex((p) => p.id === id || p.referenceCode === id);
    if (idx === -1) throw new Error(`Profile ${id} not found.`);

    demoProfilesStore[idx] = {
      ...demoProfilesStore[idx],
      ...updates,
      updatedAt: new Date().toISOString().split('T')[0],
    };
    return { ...demoProfilesStore[idx] };
  }

  async updatePreferences(
    id: string,
    preferences: Partial<PartnerPreference>,
    session: AuthSession | null
  ): Promise<PartnerPreference> {
    if (!session || !session.isAuthenticated) {
      throw new Error('UNAUTHENTICATED: Authentication required to update preferences.');
    }

    const config = getClientConfig();

    if (config.mode === 'backend') {
      const client = getSupabaseClient();
      if (!client) throw new Error('BACKEND_NOT_CONFIGURED');

      // Resolve profile UUID
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      let profileUuid = id;
      if (!isUUID) {
        const { data: prof, error: profErr } = await client
          .from('profiles')
          .select('id, account_id, created_by')
          .eq('reference_code', id)
          .maybeSingle();
        if (profErr || !prof) throw new Error(`NOT_FOUND: Profile ${id} not found.`);
        profileUuid = prof.id;
      }

      const rowPayload = profilePreferencesDTOToRow(preferences, profileUuid);

      // Try server RPC (P1-17)
      try {
        const { data: rpcData, error: rpcErr } = await client.rpc('update_profile_preferences', {
          p_profile_id: profileUuid,
          p_preferences: rowPayload,
        });

        if (!rpcErr && rpcData) {
          return profilePreferencesRowToDTO(rpcData);
        }
      } catch {
        // Fall back to direct upsert
      }

      // Direct upsert with customer RLS policy
      const { data: upsertData, error: upsertErr } = await client
        .from('profile_preferences')
        .upsert(rowPayload, { onConflict: 'profile_id' })
        .select()
        .single();

      if (upsertErr || !upsertData) {
        throw new Error(`DATABASE_ERROR: ${upsertErr?.message}`);
      }

      return profilePreferencesRowToDTO(upsertData);
    }

    // Demo Mode
    const profile = demoProfilesStore.find(
      (p) => p.id === id || p.referenceCode === id || p.databaseId === id
    );
    if (!profile) throw new Error(`NOT_FOUND: Profile ${id} not found.`);

    const isStaff = canAccessRole(session, 'nadeem');
    const isOwner =
      session.user?.id &&
      (session.user.id === profile.accountId ||
        session.user.id === profile.createdBy ||
        session.user.id === profile.databaseId ||
        session.user.id === profile.id ||
        (profile.contactEmail && session.user.email?.toLowerCase() === profile.contactEmail.toLowerCase()));

    if (!isStaff && !isOwner) {
      throw new Error('UNAUTHORIZED: Only profile owner or bureau staff can update partner preferences.');
    }

    profile.preferences = {
      ...profile.preferences,
      ...preferences,
      criteriaClassifications: {
        ...(profile.preferences?.criteriaClassifications || {}),
        ...(preferences.criteriaClassifications || {}),
      },
    };
    profile.updatedAt = new Date().toISOString().split('T')[0];
    return profile.preferences;
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
        id: d.id,
        referenceCode: d.reference_code || d.id,
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
        id: data.id,
        referenceCode: data.reference_code || data.id,
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

    const item = demoTransactionsStore.find((t) => t.id === id || t.referenceCode === id);
    return item || null;
  }

  async record(txData: Partial<FinancialTransaction>, session: AuthSession | null): Promise<FinancialTransaction> {
    if (!canAccessRole(session, 'nadeem')) {
      throw new Error('UNAUTHORIZED: Only bureau staff can record financial transactions.');
    }

    const config = getClientConfig();
    const now = new Date().toISOString().split('T')[0];
    const newId = generateCryptoUUID();
    const newRef = txData.referenceCode || txData.id || `TXN-${1000 + demoTransactionsStore.length + 1}`;

    const defaultStatus = (txData.type === 'paid' || txData.type === 'received' || txData.type === 'reversal')
      ? 'settled'
      : 'pending';
    const status = txData.status || defaultStatus;

    const newTx: FinancialTransaction = {
      id: newId,
      referenceCode: newRef,
      matchmakerId: txData.matchmakerId || 'mm-01',
      matchmakerName: txData.matchmakerName || 'Partner Agency',
      profileId: txData.profileId,
      type: txData.type || 'receivable',
      amount: txData.amount || 0,
      status,
      description: txData.description || 'Matrimonial introduction commission',
      date: txData.date || now,
    };

    if (config.mode === 'backend') {
      const client = getSupabaseClient();
      if (!client) throw new Error('BACKEND_NOT_CONFIGURED');

      const { data, error } = await client.from('financial_transactions').insert({
        id: newTx.id,
        reference_code: newTx.referenceCode,
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

    if (!reason || reason.trim().length === 0) {
      throw new Error('REVERSAL_REASON_REQUIRED: A valid business justification is mandatory to execute a reversal.');
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
      if (original.transaction_type === 'reversal' || original.reversal_of) {
        throw new Error(`CANNOT_REVERSE_REVERSAL: Transaction ${id} is already a reversal.`);
      }
      if (original.status === 'reversed') {
        throw new Error(`ALREADY_REVERSED: Transaction ${id} has already been reversed.`);
      }

      const { data: revData, error: rpcError } = await client.rpc('record_financial_reversal', {
        p_original_id: original.id,
        p_reason: reason.trim(),
        p_recorded_by: session?.user?.id || null,
      });

      if (rpcError) {
        throw new Error(`DATABASE_ERROR: ${rpcError.message}`);
      }

      return {
        id: revData.id,
        referenceCode: revData.referenceCode,
        matchmakerId: revData.matchmakerId,
        matchmakerName: revData.matchmakerName,
        profileId: revData.profileId || undefined,
        type: 'reversal',
        amount: Number(revData.amount),
        status: 'settled',
        description: revData.description,
        date: revData.date,
        reversalOf: revData.reversalOf,
        reversalReason: revData.reversalReason,
      };
    }

    const original = demoTransactionsStore.find((t) => t.id === id || t.referenceCode === id);
    if (!original) throw new Error(`NOT_FOUND: Transaction ${id} not found.`);
    if (original.type === 'reversal' || original.reversalOf) {
      throw new Error(`CANNOT_REVERSE_REVERSAL: Transaction ${id} is already a reversal.`);
    }
    if (original.status === 'reversed' || demoTransactionsStore.some((t) => t.reversalOf === original.id)) {
      throw new Error(`ALREADY_REVERSED: Transaction ${id} has already been reversed.`);
    }

    original.status = 'reversed';

    const reversalUuid = generateCryptoUUID();
    const reversalRef = `REV-${1000 + demoTransactionsStore.length + 1}`;
    const now = new Date().toISOString().split('T')[0];

    const reversalTx: FinancialTransaction = {
      id: reversalUuid,
      referenceCode: reversalRef,
      matchmakerId: original.matchmakerId,
      matchmakerName: original.matchmakerName,
      profileId: original.profileId,
      type: 'reversal',
      amount: original.amount,
      status: 'settled',
      description: `Reversal of ${original.referenceCode || original.id}: ${reason.trim()}`,
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
  private async resolveProfileUuid(
    idOrRef: string,
    client: any
  ): Promise<{ uuid: string; refCode: string; fullName?: string; phone?: string }> {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrRef);
    if (isUUID) {
      const { data, error } = await client
        .from('profiles')
        .select('id, reference_code, full_name, contact_phone')
        .eq('id', idOrRef)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`DATABASE_ERROR: ${error.message}`);
      }
      return {
        uuid: data?.id || idOrRef,
        refCode: data?.reference_code || idOrRef,
        fullName: data?.full_name,
        phone: data?.contact_phone,
      };
    }

    const { data, error } = await client
      .from('profiles')
      .select('id, reference_code, full_name, contact_phone')
      .eq('reference_code', idOrRef)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`DATABASE_ERROR: ${error.message}`);
    }

    if (!data) {
      return { uuid: idOrRef, refCode: idOrRef };
    }

    return {
      uuid: data.id,
      refCode: data.reference_code,
      fullName: data.full_name,
      phone: data.contact_phone,
    };
  }

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
        assignedTo: d.assigned_to || undefined,
        reminderSentAt: d.reminder_sent_at || undefined,
        notificationChannel: d.notification_channel || 'in_app',
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
        assignedTo: data.assigned_to || undefined,
        reminderSentAt: data.reminder_sent_at || undefined,
        notificationChannel: data.notification_channel || 'in_app',
        notes: data.notes || '',
      };
    }

    const item = demoFollowUpsStore.find((f) => f.id === id);
    return item || null;
  }

  async create(itemData: Partial<FollowUpItem>, session: AuthSession | null): Promise<FollowUpItem> {
    const isCustomerRequest =
      itemData.type === 'profile_correction' ||
      itemData.type === 'deactivation_request' ||
      itemData.type === 'photo_consent_change' ||
      itemData.type === 'customer_inquiry';
    const isStaff = canAccessRole(session, 'nadeem') || canAccessRole(session, 'admin');
    const isCustomer = session?.role === 'customer' || (session === null && isCustomerRequest);

    if (!isStaff && !isCustomerRequest && !isCustomer) {
      throw new Error('UNAUTHORIZED: Only bureau staff or candidate representatives can submit follow-up tasks.');
    }

    const config = getClientConfig();
    const newRef = itemData.id || `FU-${100 + demoFollowUpsStore.length + 1}`;
    const now = new Date().toISOString().split('T')[0];

    // P1-31: Do NOT fabricate fallback contact info
    let personName = itemData.personName?.trim();
    let contactPhone = itemData.contactPhone?.trim();
    let profileId = itemData.profileId?.trim() || '';

    if (config.mode === 'backend') {
      const client = getSupabaseClient();
      if (!client) throw new Error('BACKEND_NOT_CONFIGURED');

      let resolvedProfileUuid: string | null = null;
      let resolvedMatchCaseUuid: string | null = null;

      if (profileId) {
        const resolved = await this.resolveProfileUuid(profileId, client);
        resolvedProfileUuid = resolved.uuid;
        profileId = resolved.refCode;
        if (!personName && resolved.fullName) personName = resolved.fullName;
        if (!contactPhone && resolved.phone) contactPhone = resolved.phone;
      }

      if (itemData.candidateId) {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(itemData.candidateId);
        if (isUUID) {
          resolvedMatchCaseUuid = itemData.candidateId;
        }
      }

      // Check validation: No fabricated defaults allowed (P1-31)
      if (!personName) {
        throw new Error('VALIDATION_ERROR: Contact person name is required for CRM follow-ups.');
      }
      if (!contactPhone) {
        throw new Error('VALIDATION_ERROR: Contact phone number is required for CRM follow-ups.');
      }

      const { data, error } = await client.from('crm_follow_ups').insert({
        reference_code: newRef,
        profile_id: resolvedProfileUuid,
        match_case_id: resolvedMatchCaseUuid,
        target_type: resolvedMatchCaseUuid ? 'match_case' : 'profile',
        contact_person: personName,
        contact_phone: contactPhone,
        follow_up_type: itemData.type || 'initial_consult',
        priority: itemData.priority || 'medium',
        scheduled_date: itemData.dueDate || now,
        status: 'pending',
        assigned_to: itemData.assignedTo || null,
        notification_channel: itemData.notificationChannel || 'in_app',
        notes: itemData.notes || '',
        created_at: new Date().toISOString(),
      }).select().single();

      if (error || !data) throw new Error(`DATABASE_ERROR: ${error?.message}`);

      return {
        id: data.reference_code || data.id,
        profileId: profileId || data.profile_id || '',
        candidateId: data.match_case_id || undefined,
        personName: data.contact_person,
        contactPhone: data.contact_phone,
        type: data.follow_up_type,
        dueDate: data.scheduled_date,
        priority: data.priority,
        status: data.status,
        assignedTo: data.assigned_to || undefined,
        reminderSentAt: data.reminder_sent_at || undefined,
        notificationChannel: data.notification_channel || 'in_app',
        notes: data.notes || '',
      };
    }

    // Demo Mode
    if (!personName) {
      if (profileId) {
        const found = demoProfilesStore.find((p) => p.id === profileId || p.referenceCode === profileId);
        if (found) {
          personName = found.fullName;
          if (!contactPhone) contactPhone = found.contactPhone;
        }
      }
    }

    if (!personName) {
      throw new Error('VALIDATION_ERROR: Contact person name is required for CRM follow-ups.');
    }
    if (!contactPhone) {
      throw new Error('VALIDATION_ERROR: Contact phone number is required for CRM follow-ups.');
    }

    const newItem: FollowUpItem = {
      id: newRef,
      profileId: profileId,
      candidateId: itemData.candidateId,
      personName: personName,
      contactPhone: contactPhone,
      type: itemData.type || 'initial_consult',
      dueDate: itemData.dueDate || now,
      priority: itemData.priority || 'medium',
      status: 'pending',
      assignedTo: itemData.assignedTo,
      notificationChannel: itemData.notificationChannel || 'in_app',
      notes: itemData.notes || '',
    };

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
        assignedTo: data.assigned_to || undefined,
        reminderSentAt: data.reminder_sent_at || undefined,
        notificationChannel: data.notification_channel || 'in_app',
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
          tieredRulesJson: a.tiered_rules || undefined,
          effectiveFrom: a.effective_from,
          effectiveTo: a.effective_to || undefined,
          termsText: a.terms_text,
          isActive: a.is_active,
          createdAt: a.created_at,
        }));
        const activeAgreement = agreements.find((a) => a.isActive);

        return {
          id: d.id,
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
          tiered_rules: newAgreement.tieredRulesJson || null,
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

    const mm = await this.findById(matchmakerId, session);
    const targetUuid = mm ? mm.id : matchmakerId;
    const config = getClientConfig();

    if (config.mode === 'backend') {
      const client = getSupabaseClient();
      if (!client) throw new Error('BACKEND_NOT_CONFIGURED');

      const { data, error } = await client
        .from('matchmaker_agreements')
        .select('*')
        .eq('matchmaker_id', targetUuid)
        .order('created_at', { ascending: false });

      if (error || !data) return [];
      return data.map((a: any) => ({
        id: a.id,
        matchmakerId: a.matchmaker_id,
        agreementCode: a.agreement_code,
        feeType: a.fee_type,
        percentageRate: a.percentage_rate ? Number(a.percentage_rate) : undefined,
        flatFeePKR: a.flat_fee_pkr ? Number(a.flat_fee_pkr) : undefined,
        tieredRulesJson: a.tiered_rules || undefined,
        effectiveFrom: a.effective_from,
        effectiveTo: a.effective_to || undefined,
        termsText: a.terms_text,
        isActive: a.is_active,
        createdAt: a.created_at,
      }));
    }

    return demoAgreementsStore
      .filter((a) => a.matchmakerId === targetUuid)
      .slice()
      .reverse()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  private async resolveProfileUuid(
    idOrRef: string,
    client: any
  ): Promise<{ uuid: string; refCode: string }> {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrRef);
    if (isUUID) {
      const { data, error } = await client
        .from('profiles')
        .select('id, reference_code')
        .eq('id', idOrRef)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`DATABASE_ERROR: ${error.message}`);
      }
      return {
        uuid: idOrRef,
        refCode: data?.reference_code || idOrRef,
      };
    }

    const { data, error } = await client
      .from('profiles')
      .select('id, reference_code')
      .eq('reference_code', idOrRef)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`DATABASE_ERROR: ${error.message}`);
    }

    if (!data) {
      return { uuid: idOrRef, refCode: idOrRef };
    }

    return {
      uuid: data.id,
      refCode: data.reference_code,
    };
  }

  async attributeReferral(
    matchmakerId: string,
    profileId: string,
    session: AuthSession | null,
    notes?: string
  ): Promise<{ success: boolean; matchmaker: DetailedExternalMatchmaker; attribution?: ReferralAttribution }> {
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

      const profileRes = await this.resolveProfileUuid(profileId, client);

      const { data: rpcData, error: rpcError } = await client.rpc('attribute_profile_referral', {
        p_matchmaker_id: matchmaker.id,
        p_profile_id: profileRes.uuid,
        p_notes: notes || null,
        p_attributed_by: session?.user?.id || null,
      });

      if (rpcError) {
        throw new Error(`DATABASE_ERROR: ${rpcError.message}`);
      }

      matchmaker.profilesReferredCount = rpcData?.totalReferrals ?? (matchmaker.profilesReferredCount + 1);
      return {
        success: true,
        matchmaker,
        attribution: rpcData ? {
          id: rpcData.id,
          matchmakerId: rpcData.matchmakerId,
          profileId: rpcData.profileId,
          referralSource: rpcData.referralSource,
          attributedBy: rpcData.attributedBy,
          notes: rpcData.notes,
          createdAt: rpcData.createdAt,
        } : undefined,
      };
    }

    // Demo Mode (P1-34)
    const existingAttr = demoReferralAttributionsStore.find(
      (a) => a.matchmakerId === matchmaker.id && a.profileId === profileId
    );

    let attribution: ReferralAttribution;
    if (existingAttr) {
      if (notes) existingAttr.notes = notes;
      attribution = existingAttr;
    } else {
      attribution = {
        id: generateCryptoUUID(),
        matchmakerId: matchmaker.id,
        profileId,
        referralSource: 'external_partner',
        attributedBy: session?.user?.id || 'usr-nadeem',
        notes,
        createdAt: new Date().toISOString(),
      };
      demoReferralAttributionsStore.push(attribution);
      matchmaker.profilesReferredCount += 1;
    }

    return { success: true, matchmaker, attribution };
  }

  async getReferralAttributions(
    matchmakerId: string,
    session: AuthSession | null
  ): Promise<ReferralAttribution[]> {
    if (!canAccessRole(session, 'nadeem') && !canAccessRole(session, 'admin')) {
      throw new Error('UNAUTHORIZED: Only bureau staff can view referral attributions.');
    }

    const mm = await this.findById(matchmakerId, session);
    const targetUuid = mm ? mm.id : matchmakerId;

    const config = getClientConfig();
    if (config.mode === 'backend') {
      const client = getSupabaseClient();
      if (!client) throw new Error('BACKEND_NOT_CONFIGURED');

      const { data, error } = await client
        .from('referral_attributions')
        .select('*')
        .eq('matchmaker_id', targetUuid)
        .order('created_at', { ascending: false });

      if (error || !data) return [];
      return data.map((d: any) => ({
        id: d.id,
        matchmakerId: d.matchmaker_id,
        profileId: d.profile_id,
        referralSource: d.referral_source,
        attributedBy: d.attributed_by || undefined,
        notes: d.notes || undefined,
        createdAt: d.created_at,
      }));
    }

    return demoReferralAttributionsStore.filter((a) => a.matchmakerId === targetUuid);
  }
}

// =============================================================================
// Match Repository Implementation (MATCH-03)
// =============================================================================

class MatchRepositoryImpl implements IMatchRepository {
  private async resolveProfileUuid(
    idOrRef: string,
    client: any
  ): Promise<{ uuid: string; refCode: string }> {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrRef);
    if (isUUID) {
      const { data, error } = await client
        .from('profiles')
        .select('id, reference_code')
        .eq('id', idOrRef)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`DATABASE_ERROR: ${error.message}`);
      }

      return {
        uuid: idOrRef,
        refCode: data?.reference_code || idOrRef,
      };
    }

    const { data, error } = await client
      .from('profiles')
      .select('id, reference_code')
      .eq('reference_code', idOrRef)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`DATABASE_ERROR: ${error.message}`);
    }

    if (!data) {
      throw new Error(`PROFILE_NOT_FOUND: Profile with reference code "${idOrRef}" not found.`);
    }

    return {
      uuid: data.id,
      refCode: data.reference_code,
    };
  }

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

      const profA = await this.resolveProfileUuid(profileAId, client);
      const profB = await this.resolveProfileUuid(profileBId, client);

      const [lowUuid, highUuid] = profA.uuid < profB.uuid ? [profA.uuid, profB.uuid] : [profB.uuid, profA.uuid];

      // Try RPC first for canonical ordering and atomic insertion (P1-23)
      const { data: rpcData, error: rpcErr } = await client.rpc('get_or_create_match_case', {
        p_profile_a_id: lowUuid,
        p_profile_b_id: highUuid,
        p_created_by: session?.user?.id || null,
      });

      if (!rpcErr && rpcData) {
        return {
          id: rpcData.id,
          caseCode: rpcData.case_code,
          profileAId: rpcData.profile_a_id === profA.uuid ? profA.refCode : profB.refCode,
          profileBId: rpcData.profile_b_id === profB.uuid ? profB.refCode : profA.refCode,
          profileAUuid: rpcData.profile_a_id,
          profileBUuid: rpcData.profile_b_id,
          status: rpcData.status,
          createdBy: rpcData.created_by || undefined,
          createdAt: rpcData.created_at,
          updatedAt: rpcData.updated_at,
        };
      }

      // Fallback direct table query if RPC is not deployed yet or for compatibility
      const { data: existing, error: findErr } = await client
        .from('match_cases')
        .select('*')
        .or(`and(profile_a_id.eq.${lowUuid},profile_b_id.eq.${highUuid}),and(profile_a_id.eq.${highUuid},profile_b_id.eq.${lowUuid})`)
        .maybeSingle();

      if (findErr && findErr.code !== 'PGRST116') {
        throw new Error(`DATABASE_ERROR: ${findErr.message}`);
      }

      if (existing) {
        return {
          id: existing.id,
          caseCode: existing.case_code,
          profileAId: existing.profile_a_id === profA.uuid ? profA.refCode : profB.refCode,
          profileBId: existing.profile_b_id === profB.uuid ? profB.refCode : profA.refCode,
          profileAUuid: existing.profile_a_id,
          profileBUuid: existing.profile_b_id,
          status: existing.status,
          createdBy: existing.created_by || undefined,
          createdAt: existing.created_at,
          updatedAt: existing.updated_at,
        };
      }

      const caseCode = `MC-${profA.refCode.slice(-4)}-${profB.refCode.slice(-4)}-${Math.floor(100 + Math.random() * 900)}`;
      const { data: created, error: insertErr } = await client
        .from('match_cases')
        .insert({
          case_code: caseCode,
          profile_a_id: lowUuid,
          profile_b_id: highUuid,
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
        profileAId: created.profile_a_id === profA.uuid ? profA.refCode : profB.refCode,
        profileBId: created.profile_b_id === profB.uuid ? profB.refCode : profA.refCode,
        profileAUuid: created.profile_a_id,
        profileBUuid: created.profile_b_id,
        status: created.status,
        createdBy: created.created_by || undefined,
        createdAt: created.created_at,
        updatedAt: created.updated_at,
      };
    }

    // Demo Mode: Enforce canonical profile pair ordering (P1-23)
    const [canonicalA, canonicalB] = profileAId < profileBId ? [profileAId, profileBId] : [profileBId, profileAId];

    const existing = demoMatchCasesStore.find(
      (m) =>
        (m.profileAId === canonicalA && m.profileBId === canonicalB) ||
        (m.profileAId === canonicalB && m.profileBId === canonicalA)
    );

    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const newCase: MatchCaseRecord = {
      id: generateCryptoUUID(),
      caseCode: `MC-${canonicalA.slice(-4)}-${canonicalB.slice(-4)}-${Math.floor(100 + Math.random() * 900)}`,
      profileAId: canonicalA,
      profileBId: canonicalB,
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

      const profA = await this.resolveProfileUuid(profileAId, client);
      const profB = await this.resolveProfileUuid(profileBId, client);

      const [lowUuid, highUuid] = profA.uuid < profB.uuid ? [profA.uuid, profB.uuid] : [profB.uuid, profA.uuid];

      const { data, error } = await client
        .from('match_cases')
        .select('*')
        .or(`and(profile_a_id.eq.${lowUuid},profile_b_id.eq.${highUuid}),and(profile_a_id.eq.${highUuid},profile_b_id.eq.${lowUuid})`)
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw new Error(`DATABASE_ERROR: ${error.message}`);
      }
      if (!data) return null;

      return {
        id: data.id,
        caseCode: data.case_code,
        profileAId: data.profile_a_id === profA.uuid ? profA.refCode : profB.refCode,
        profileBId: data.profile_b_id === profB.uuid ? profB.refCode : profA.refCode,
        profileAUuid: data.profile_a_id,
        profileBUuid: data.profile_b_id,
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
    notes?: string,
    adminOverride?: boolean
  ): Promise<MatchDecisionRecord> {
    const isNadeem = !!(session?.isAuthenticated && session?.role === 'nadeem');
    const isAdmin = !!(session?.isAuthenticated && session?.role === 'admin');

    if (!isNadeem && !isAdmin) {
      throw new Error('UNAUTHORIZED: Only bureau staff may record match review decisions.');
    }

    // P1-22: Admin override requires explicit flag
    if (isAdmin && !adminOverride) {
      throw new Error('ADMIN_OVERRIDE_REQUIRED: Administrative match decision requires explicit admin_override flag.');
    }

    const config = getClientConfig();

    if (config.mode === 'backend') {
      const client = getSupabaseClient();
      if (!client) throw new Error('BACKEND_NOT_CONFIGURED');

      // Call atomic database RPC (P1-20, P1-21, P1-22)
      const { data: rpcResult, error: rpcErr } = await client.rpc('record_match_decision', {
        p_match_case_id: matchCaseId,
        p_decision: decision,
        p_reason_code: reasonCode,
        p_notes: notes?.trim() || null,
        p_decided_by: session?.user?.id || null,
        p_admin_override: !!adminOverride || (isAdmin && !isNadeem),
      });

      if (rpcErr) {
        if (rpcErr.message.includes('NO_EVALUATION_FOUND')) {
          throw new Error('CANNOT_APPROVE_WITHOUT_EVALUATION: A match cannot be approved without a persisted match evaluation.');
        }
        if (rpcErr.message.includes('CANNOT_APPROVE_INELIGIBLE_MATCH')) {
          throw new Error('CANNOT_APPROVE_INELIGIBLE_MATCH: Mandatory criteria violated.');
        }
        if (rpcErr.message.includes('ADMIN_OVERRIDE_REQUIRED')) {
          throw new Error('ADMIN_OVERRIDE_REQUIRED: Administrative match decision requires explicit admin_override flag.');
        }
        if (rpcErr.message.includes('UNAUTHORIZED')) {
          throw new Error('UNAUTHORIZED: Only bureau staff may record match review decisions.');
        }
        throw new Error(`DB_DECISION_FAILED: ${rpcErr.message}`);
      }

      return {
        id: rpcResult.decision_id,
        matchCaseId: rpcResult.match_case_id,
        decision: rpcResult.decision,
        decidedBy: rpcResult.decided_by || undefined,
        reasonCode: rpcResult.reason_code,
        notes: rpcResult.notes || undefined,
        decidedAt: rpcResult.decided_at,
      };
    }

    // Demo Mode
    const matchCase = demoMatchCasesStore.find((m) => m.id === matchCaseId);
    if (!matchCase) {
      throw new Error(`NOT_FOUND: Match case ${matchCaseId} not found.`);
    }

    // P1-20: Mandatory evaluation check before approval
    if (decision === 'approved') {
      const evals = demoMatchEvaluationsStore.filter((e) => e.matchCaseId === matchCaseId);
      if (evals.length === 0) {
        throw new Error('CANNOT_APPROVE_WITHOUT_EVALUATION: A match cannot be approved without a persisted match evaluation.');
      }
      const latestEval = evals[evals.length - 1];
      if (!latestEval.mandatorySatisfied) {
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

    // Atomic update of status in memory (P1-21)
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
    restoredEvaluation?: MatchEvaluation;
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

      if (cErr) {
        throw new Error(`DATABASE_ERROR: ${cErr.message}`);
      }
      if (!cData) return null;

      const { data: eData, error: eErr } = await client
        .from('match_evaluations')
        .select('*')
        .eq('match_case_id', matchCaseId)
        .order('evaluated_at', { ascending: false });

      if (eErr) {
        throw new Error(`DATABASE_ERROR: ${eErr.message}`);
      }

      const { data: dData, error: dErr } = await client
        .from('match_decisions')
        .select('*')
        .eq('match_case_id', matchCaseId)
        .order('decided_at', { ascending: false });

      if (dErr) {
        throw new Error(`DATABASE_ERROR: ${dErr.message}`);
      }

      const evaluationsList: MatchEvaluationRecord[] = (eData || []).map((e: any) => ({
        id: e.id,
        matchCaseId: e.match_case_id,
        algorithmVersion: e.algorithm_version,
        compatibilityScore: e.compatibility_score,
        mandatorySatisfied: e.mandatory_satisfied,
        criteriaBreakdown: e.criteria_breakdown,
        evaluationNotes: e.evaluation_notes || undefined,
        evaluatedAt: e.evaluated_at,
      }));

      const decisionsList: MatchDecisionRecord[] = (dData || []).map((d: any) => ({
        id: d.id,
        matchCaseId: d.match_case_id,
        decision: d.decision,
        decidedBy: d.decided_by || undefined,
        reasonCode: d.reason_code,
        notes: d.notes || undefined,
        decidedAt: d.decided_at,
      }));

      // Restore decision state onto evaluation DTO (P1-24)
      let restoredEvaluation: MatchEvaluation | undefined = undefined;
      if (evaluationsList.length > 0) {
        const latestEval = evaluationsList[0];
        const latestDec = decisionsList.length > 0 ? decisionsList[0] : undefined;

        let effectiveDecision: 'pending_review' | 'approved_by_nadeem' | 'deferred' | 'rejected' = 'pending_review';
        if (cData.status === 'approved_by_nadeem') {
          effectiveDecision = 'approved_by_nadeem';
        } else if (latestDec) {
          if (latestDec.decision === 'approved') effectiveDecision = 'approved_by_nadeem';
          else if (latestDec.decision === 'rejected') effectiveDecision = 'rejected';
          else if (latestDec.decision === 'deferred') effectiveDecision = 'deferred';
        }

        restoredEvaluation = {
          primaryProfileId: cData.profile_a_id,
          candidateProfileId: cData.profile_b_id,
          evaluatedAt: latestEval.evaluatedAt,
          algorithmVersion: latestEval.algorithmVersion,
          overallScore: latestEval.compatibilityScore,
          isEligible: latestEval.mandatorySatisfied,
          isMandatorySatisfied: latestEval.mandatorySatisfied,
          criteria: latestEval.criteriaBreakdown as EvaluatedCriterion[],
          summaryEn: latestEval.evaluationNotes || '',
          summaryUrdu: '',
          requiresHumanApproval: true,
          humanDecisionStatus: effectiveDecision,
          reviewedBy: latestDec?.decidedBy,
          reviewedAt: latestDec?.decidedAt,
          reviewNotes: latestDec?.notes,
        };
      }

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
        evaluations: evaluationsList,
        decisions: decisionsList,
        restoredEvaluation,
      };
    }

    const matchCase = demoMatchCasesStore.find((m) => m.id === matchCaseId);
    if (!matchCase) return null;

    const evaluations = demoMatchEvaluationsStore.filter((e) => e.matchCaseId === matchCaseId);
    const decisions = demoMatchDecisionsStore.filter((d) => d.matchCaseId === matchCaseId);

    // Restore decision state onto evaluation DTO in demo mode (P1-24)
    let restoredEvaluation: MatchEvaluation | undefined = undefined;
    if (evaluations.length > 0) {
      const latestEval = evaluations[evaluations.length - 1];
      const latestDec = decisions.length > 0 ? decisions[decisions.length - 1] : undefined;

      let effectiveDecision: 'pending_review' | 'approved_by_nadeem' | 'deferred' | 'rejected' = 'pending_review';
      if (matchCase.status === 'approved_by_nadeem') {
        effectiveDecision = 'approved_by_nadeem';
      } else if (latestDec) {
        if (latestDec.decision === 'approved') effectiveDecision = 'approved_by_nadeem';
        else if (latestDec.decision === 'rejected') effectiveDecision = 'rejected';
        else if (latestDec.decision === 'deferred') effectiveDecision = 'deferred';
      }

      restoredEvaluation = {
        primaryProfileId: matchCase.profileAId,
        candidateProfileId: matchCase.profileBId,
        evaluatedAt: latestEval.evaluatedAt,
        algorithmVersion: latestEval.algorithmVersion,
        overallScore: latestEval.compatibilityScore,
        isEligible: latestEval.mandatorySatisfied,
        isMandatorySatisfied: latestEval.mandatorySatisfied,
        criteria: latestEval.criteriaBreakdown as EvaluatedCriterion[],
        summaryEn: latestEval.evaluationNotes || '',
        summaryUrdu: '',
        requiresHumanApproval: true,
        humanDecisionStatus: effectiveDecision,
        reviewedBy: latestDec?.decidedBy,
        reviewedAt: latestDec?.decidedAt,
        reviewNotes: latestDec?.notes,
      };
    }

    return {
      matchCase,
      evaluations,
      decisions,
      restoredEvaluation,
    };
  }

  async getApprovedRecommendationsForCustomer(
    profileId: string,
    session: AuthSession | null
  ): Promise<MatchRecommendation[]> {
    const config = getClientConfig();

    if (config.mode === 'backend') {
      const client = getSupabaseClient();
      if (!client) throw new Error('BACKEND_NOT_CONFIGURED');

      const { uuid: resolvedUuid } = await this.resolveProfileUuid(profileId, client);

      const { data, error } = await client.rpc('get_customer_recommendations', {
        p_profile_id: resolvedUuid,
      });

      if (error) {
        throw new Error(`DATABASE_ERROR: ${error.message}`);
      }

      if (!Array.isArray(data)) return [];

      return data.map((item: any) => ({
        id: item.id,
        caseCode: item.caseCode,
        requestingProfileId: profileId,
        candidateProfileId: item.candidateProfileId,
        matchScore: item.matchScore,
        compatibilitySummaryEn: item.compatibilitySummaryEn,
        compatibilitySummaryUrdu: item.compatibilitySummaryUrdu,
        status: item.status,
        reviewedDate: item.reviewedDate,
        candidateProfile: item.candidateProfile,
      }));
    }

    // Demo Mode: Filter INITIAL_RECOMMENDATIONS for profileId where status is approved (P1-16)
    const approvedStatuses = ['approved_by_nadeem', 'shared_with_parties', 'accepted_by_customer'];
    const matchingRecs = INITIAL_RECOMMENDATIONS.filter(
      (r) =>
        (r.requestingProfileId === profileId || r.candidateProfileId === profileId) &&
        approvedStatuses.includes(r.status)
    );

    return matchingRecs.map((rec) => {
      const otherId = rec.requestingProfileId === profileId ? rec.candidateProfileId : rec.requestingProfileId;
      const candidate = demoProfilesStore.find((p) => p.id === otherId || p.referenceCode === otherId);
      const sanitizedCandidate = candidate
        ? sanitizeProfileForRole(candidate, 'customer', false)
        : undefined;

      return {
        ...rec,
        candidateProfile: sanitizedCandidate,
      };
    });
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

// =============================================================================
// Photo Repository Implementation (P0-07, P1-25, P1-26, P1-28)
// =============================================================================

export class PhotoRepositoryImpl implements IPhotoRepository {
  async upload(
    profileId: string,
    file: { name: string; size: number; type: string; data?: Blob | ArrayBuffer | Uint8Array | File },
    consentCertified: boolean,
    session: AuthSession | null
  ): Promise<{ success: boolean; photo: PhotoRecord | null; error?: string }> {
    const res = await uploadCandidatePhoto(profileId, file, consentCertified, session);
    if (!res.success) {
      return { success: false, photo: null, error: res.error?.messageEn || 'Photo upload failed' };
    }
    return { success: true, photo: res.photo };
  }

  async getSignedUrl(storagePath: string, expiresInSeconds: number = 3600): Promise<string> {
    return resolveCandidatePhotoUrl(storagePath, expiresInSeconds);
  }

  async purgeAndErase(
    profileId: string,
    session: AuthSession | null,
    eraseProfile: boolean = false
  ): Promise<{ success: boolean; purgedPhotoId: string | null; grantsRevokedCount: number; error?: string }> {
    const res = await executeCandidatePrivacyErasureAsync(profileId, session, eraseProfile);
    if (!res.success) {
      return {
        success: false,
        purgedPhotoId: null,
        grantsRevokedCount: 0,
        error: res.error?.messageEn || 'Privacy erasure failed',
      };
    }
    return {
      success: true,
      purgedPhotoId: res.purgedPhotoId,
      grantsRevokedCount: res.grantsRevokedCount,
    };
  }
}

// =============================================================================
// Share Grant Repository Implementation (P0-08, P1-27)
// =============================================================================

export class ShareGrantRepositoryImpl implements IShareGrantRepository {
  async createGrant(
    snapshot: AuthorizedDisclosureSnapshot,
    session: AuthSession | null,
    recipientContext?: { recipientType?: string; recipientPhone?: string }
  ): Promise<{ success: boolean; grantId: string; error?: string }> {
    return persistShareGrantAsync(snapshot, session, recipientContext);
  }

  async redeemGrant(tokenOrHash: string): Promise<{
    valid: boolean;
    reason?: string;
    snapshot?: AuthorizedDisclosureSnapshot;
    referenceCode?: string;
  }> {
    return redeemShareGrantAsync(tokenOrHash);
  }

  async revokeGrant(
    tokenOrHashOrGrantId: string,
    session: AuthSession | null
  ): Promise<{ success: boolean; error?: string }> {
    return revokeShareGrantAsync(tokenOrHashOrGrantId, session);
  }
}

export let photoRepository: IPhotoRepository = new PhotoRepositoryImpl();
export let shareGrantRepository: IShareGrantRepository = new ShareGrantRepositoryImpl();

export function setPhotoRepositoryForTesting(repo: IPhotoRepository): void {
  photoRepository = repo;
}

export function resetPhotoRepositoryForTesting(): void {
  photoRepository = new PhotoRepositoryImpl();
}

export function setShareGrantRepositoryForTesting(repo: IShareGrantRepository): void {
  shareGrantRepository = repo;
}

export function resetShareGrantRepositoryForTesting(): void {
  shareGrantRepository = new ShareGrantRepositoryImpl();
}

// =============================================================================
// Migration Repository Implementation (P1-39, P1-47)
// =============================================================================

function mapBatchRowToRecord(row: any): MigrationBatchRecord {
  return {
    id: row.id,
    batchCode: row.batch_code,
    sourceType: row.source_type,
    sourceReference: row.source_reference,
    sourceChecksum: row.source_checksum,
    totalRecords: row.total_records ?? 0,
    stagedRecords: row.staged_records ?? 0,
    quarantinedRecords: row.quarantined_records ?? 0,
    importedRecords: row.imported_records ?? 0,
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ownerApprovedBy: row.owner_approved_by,
    ownerApprovedAt: row.owner_approved_at,
    reconciledAt: row.reconciled_at,
    rolledBackAt: row.rolled_back_at,
    rollbackReason: row.rollback_reason,
  };
}

function mapStagedRowToRecord(row: any): MigrationStagedRecord {
  return {
    id: row.id,
    batchId: row.batch_id,
    rowIndex: row.row_index,
    rawContent: row.raw_content,
    parsedData: row.parsed_payload || {},
    sourceProvenance: row.source_provenance || {},
    consentVerification: row.consent_verification || {},
    status: row.status,
    quarantineReason: row.quarantine_reason,
    conflictProfileId: row.conflict_profile_id,
    conflictDetails: row.conflict_details,
    resolutionAction: row.resolution_action,
    resolutionNotes: row.resolution_notes,
    resolvedBy: row.resolved_by,
    resolvedAt: row.resolved_at,
    importedProfileId: row.imported_profile_id,
    createdAt: row.created_at,
    isRawPurged: row.is_raw_purged,
    rawContentHash: row.raw_content_hash,
  };
}

export class MigrationRepositoryImpl implements IMigrationRepository {
  async createBatch(
    batch: Omit<MigrationBatchRecord, 'id' | 'createdAt'> & { id?: string },
    session: AuthSession | null
  ): Promise<MigrationBatchRecord> {
    if (!session || !session.isAuthenticated || (session.role !== 'admin' && session.role !== 'nadeem')) {
      throw new Error('Unauthorized: Staff access required to create migration batches.');
    }
    const config = getClientConfig();
    const id = batch.id || generateCryptoUUID();
    const now = new Date().toISOString();

    if (config.mode === 'backend') {
      const client = getSupabaseClient();
      if (!client) throw new Error('BACKEND_NOT_CONFIGURED');
      const row = {
        id,
        batch_code: batch.batchCode,
        source_type: batch.sourceType,
        source_reference: batch.sourceReference,
        source_checksum: batch.sourceChecksum,
        total_records: batch.totalRecords || 0,
        staged_records: batch.stagedRecords || 0,
        quarantined_records: batch.quarantinedRecords || 0,
        imported_records: batch.importedRecords || 0,
        status: batch.status || 'cataloged',
        created_by: session.user?.id || batch.createdBy,
        created_at: now,
        updated_at: now,
      };
      const { data, error } = await client.from('migration_batches').insert(row).select().single();
      if (error) throw new Error(`DATABASE_ERROR: ${error.message}`);
      return mapBatchRowToRecord(data);
    }

    const created: MigrationBatchRecord = {
      id,
      batchCode: batch.batchCode,
      sourceType: batch.sourceType,
      sourceReference: batch.sourceReference,
      sourceChecksum: batch.sourceChecksum,
      totalRecords: batch.totalRecords || 0,
      stagedRecords: batch.stagedRecords || 0,
      quarantinedRecords: batch.quarantinedRecords || 0,
      importedRecords: batch.importedRecords || 0,
      status: batch.status || 'cataloged',
      createdBy: batch.createdBy,
      createdAt: now,
      updatedAt: now,
    };
    demoMigrationBatchesStore.push({ ...created });
    return { ...created };
  }

  async findBatchById(batchId: string, session: AuthSession | null): Promise<MigrationBatchRecord | null> {
    const config = getClientConfig();
    if (config.mode === 'backend') {
      const client = getSupabaseClient();
      if (!client) throw new Error('BACKEND_NOT_CONFIGURED');
      const { data, error } = await client.from('migration_batches').select('*').eq('id', batchId).maybeSingle();
      if (error && error.code !== 'PGRST116') throw new Error(`DATABASE_ERROR: ${error.message}`);
      return data ? mapBatchRowToRecord(data) : null;
    }
    const found = demoMigrationBatchesStore.find((b) => b.id === batchId);
    return found ? { ...found } : null;
  }

  async findBatchByCode(batchCode: string, session: AuthSession | null): Promise<MigrationBatchRecord | null> {
    const config = getClientConfig();
    if (config.mode === 'backend') {
      const client = getSupabaseClient();
      if (!client) throw new Error('BACKEND_NOT_CONFIGURED');
      const { data, error } = await client.from('migration_batches').select('*').eq('batch_code', batchCode).maybeSingle();
      if (error && error.code !== 'PGRST116') throw new Error(`DATABASE_ERROR: ${error.message}`);
      return data ? mapBatchRowToRecord(data) : null;
    }
    const found = demoMigrationBatchesStore.find((b) => b.batchCode === batchCode);
    return found ? { ...found } : null;
  }

  async findAllBatches(session: AuthSession | null): Promise<MigrationBatchRecord[]> {
    const config = getClientConfig();
    if (config.mode === 'backend') {
      const client = getSupabaseClient();
      if (!client) throw new Error('BACKEND_NOT_CONFIGURED');
      const { data, error } = await client.from('migration_batches').select('*').order('created_at', { ascending: false });
      if (error) throw new Error(`DATABASE_ERROR: ${error.message}`);
      return (data || []).map(mapBatchRowToRecord);
    }
    return demoMigrationBatchesStore.map((b) => ({ ...b }));
  }

  async updateBatch(
    batchId: string,
    updates: Partial<MigrationBatchRecord>,
    session: AuthSession | null
  ): Promise<MigrationBatchRecord> {
    if (!session || !session.isAuthenticated || (session.role !== 'admin' && session.role !== 'nadeem')) {
      throw new Error('Unauthorized: Staff access required to update migration batch.');
    }
    const config = getClientConfig();
    const now = new Date().toISOString();

    if (config.mode === 'backend') {
      const client = getSupabaseClient();
      if (!client) throw new Error('BACKEND_NOT_CONFIGURED');
      const patch: any = { updated_at: now };
      if (updates.status !== undefined) patch.status = updates.status;
      if (updates.totalRecords !== undefined) patch.total_records = updates.totalRecords;
      if (updates.stagedRecords !== undefined) patch.staged_records = updates.stagedRecords;
      if (updates.quarantinedRecords !== undefined) patch.quarantined_records = updates.quarantinedRecords;
      if (updates.importedRecords !== undefined) patch.imported_records = updates.importedRecords;
      if (updates.ownerApprovedBy !== undefined) patch.owner_approved_by = updates.ownerApprovedBy;
      if (updates.ownerApprovedAt !== undefined) patch.owner_approved_at = updates.ownerApprovedAt;
      if (updates.reconciledAt !== undefined) patch.reconciled_at = updates.reconciledAt;
      if (updates.rolledBackAt !== undefined) patch.rolled_back_at = updates.rolledBackAt;
      if (updates.rollbackReason !== undefined) patch.rollback_reason = updates.rollbackReason;

      const { data, error } = await client.from('migration_batches').update(patch).eq('id', batchId).select().single();
      if (error) throw new Error(`DATABASE_ERROR: ${error.message}`);
      return mapBatchRowToRecord(data);
    }

    const idx = demoMigrationBatchesStore.findIndex((b) => b.id === batchId);
    if (idx === -1) throw new Error(`Migration batch ${batchId} not found.`);
    demoMigrationBatchesStore[idx] = {
      ...demoMigrationBatchesStore[idx],
      ...updates,
      updatedAt: now,
    };
    return { ...demoMigrationBatchesStore[idx] };
  }

  async createStagedRecords(
    records: Array<Omit<MigrationStagedRecord, 'id'> & { id?: string }>,
    session: AuthSession | null
  ): Promise<MigrationStagedRecord[]> {
    if (!session || !session.isAuthenticated || (session.role !== 'admin' && session.role !== 'nadeem')) {
      throw new Error('Unauthorized: Staff access required to stage records.');
    }
    const config = getClientConfig();
    const now = new Date().toISOString();

    if (config.mode === 'backend') {
      const client = getSupabaseClient();
      if (!client) throw new Error('BACKEND_NOT_CONFIGURED');
      const rows = records.map((r) => ({
        id: r.id || generateCryptoUUID(),
        batch_id: r.batchId,
        row_index: r.rowIndex,
        raw_content: r.rawContent ?? null,
        parsed_payload: r.parsedData,
        source_provenance: r.sourceProvenance,
        consent_verification: r.consentVerification,
        status: r.status,
        quarantine_reason: r.quarantineReason || null,
        conflict_profile_id: r.conflictProfileId || null,
        conflict_details: r.conflictDetails || null,
        resolution_action: r.resolutionAction || null,
        resolution_notes: r.resolutionNotes || null,
        resolved_by: r.resolvedBy || null,
        resolved_at: r.resolvedAt || null,
        imported_profile_id: r.importedProfileId || null,
        created_at: now,
        is_raw_purged: r.isRawPurged || false,
        raw_content_hash: r.rawContentHash || null,
      }));
      const { data, error } = await client.from('migration_staged_records').insert(rows).select();
      if (error) throw new Error(`DATABASE_ERROR: ${error.message}`);
      return (data || []).map(mapStagedRowToRecord);
    }

    const createdList: MigrationStagedRecord[] = records.map((r) => {
      const item: MigrationStagedRecord = {
        id: r.id || `rec-${generateCryptoUUID().slice(0, 8)}`,
        batchId: r.batchId,
        rowIndex: r.rowIndex,
        rawContent: r.rawContent,
        parsedData: { ...r.parsedData },
        sourceProvenance: { ...r.sourceProvenance },
        consentVerification: { ...r.consentVerification },
        status: r.status,
        quarantineReason: r.quarantineReason,
        conflictProfileId: r.conflictProfileId,
        conflictDetails: r.conflictDetails,
        resolutionAction: r.resolutionAction,
        resolutionNotes: r.resolutionNotes,
        resolvedBy: r.resolvedBy,
        resolvedAt: r.resolvedAt,
        importedProfileId: r.importedProfileId,
        createdAt: now,
        isRawPurged: r.isRawPurged || false,
        rawContentHash: r.rawContentHash,
      };
      demoStagedRecordsStore.push(item);
      return { ...item };
    });
    return createdList;
  }

  async findStagedRecordsByBatch(batchId: string, session: AuthSession | null): Promise<MigrationStagedRecord[]> {
    const config = getClientConfig();
    if (config.mode === 'backend') {
      const client = getSupabaseClient();
      if (!client) throw new Error('BACKEND_NOT_CONFIGURED');
      const { data, error } = await client
        .from('migration_staged_records')
        .select('*')
        .eq('batch_id', batchId)
        .order('row_index', { ascending: true });
      if (error) throw new Error(`DATABASE_ERROR: ${error.message}`);
      return (data || []).map(mapStagedRowToRecord);
    }
    return demoStagedRecordsStore.filter((r) => r.batchId === batchId).map((r) => ({ ...r }));
  }

  async findStagedRecordById(recordId: string, session: AuthSession | null): Promise<MigrationStagedRecord | null> {
    const config = getClientConfig();
    if (config.mode === 'backend') {
      const client = getSupabaseClient();
      if (!client) throw new Error('BACKEND_NOT_CONFIGURED');
      const { data, error } = await client.from('migration_staged_records').select('*').eq('id', recordId).maybeSingle();
      if (error && error.code !== 'PGRST116') throw new Error(`DATABASE_ERROR: ${error.message}`);
      return data ? mapStagedRowToRecord(data) : null;
    }
    const found = demoStagedRecordsStore.find((r) => r.id === recordId);
    return found ? { ...found } : null;
  }

  async updateStagedRecord(
    recordId: string,
    updates: Partial<MigrationStagedRecord>,
    session: AuthSession | null
  ): Promise<MigrationStagedRecord> {
    if (!session || !session.isAuthenticated || (session.role !== 'admin' && session.role !== 'nadeem')) {
      throw new Error('Unauthorized: Staff access required to update staged records.');
    }
    const config = getClientConfig();

    if (config.mode === 'backend') {
      const client = getSupabaseClient();
      if (!client) throw new Error('BACKEND_NOT_CONFIGURED');
      const patch: any = {};
      if (updates.status !== undefined) patch.status = updates.status;
      if (updates.quarantineReason !== undefined) patch.quarantine_reason = updates.quarantineReason;
      if (updates.conflictProfileId !== undefined) patch.conflict_profile_id = updates.conflictProfileId;
      if (updates.conflictDetails !== undefined) patch.conflict_details = updates.conflictDetails;
      if (updates.resolutionAction !== undefined) patch.resolution_action = updates.resolutionAction;
      if (updates.resolutionNotes !== undefined) patch.resolution_notes = updates.resolutionNotes;
      if (updates.resolvedBy !== undefined) patch.resolved_by = updates.resolvedBy;
      if (updates.resolvedAt !== undefined) patch.resolved_at = updates.resolvedAt;
      if (updates.importedProfileId !== undefined) patch.imported_profile_id = updates.importedProfileId;
      if (updates.parsedData !== undefined) patch.parsed_payload = updates.parsedData;
      if (updates.consentVerification !== undefined) patch.consent_verification = updates.consentVerification;
      if (updates.rawContent !== undefined) patch.raw_content = updates.rawContent;
      if (updates.isRawPurged !== undefined) patch.is_raw_purged = updates.isRawPurged;
      if (updates.rawContentHash !== undefined) patch.raw_content_hash = updates.rawContentHash;

      const { data, error } = await client.from('migration_staged_records').update(patch).eq('id', recordId).select().single();
      if (error) throw new Error(`DATABASE_ERROR: ${error.message}`);
      return mapStagedRowToRecord(data);
    }

    const idx = demoStagedRecordsStore.findIndex((r) => r.id === recordId);
    if (idx === -1) throw new Error(`Staged record ${recordId} not found.`);
    demoStagedRecordsStore[idx] = {
      ...demoStagedRecordsStore[idx],
      ...updates,
    };
    return { ...demoStagedRecordsStore[idx] };
  }

  async purgeRawContent(batchId: string, session: AuthSession | null): Promise<{ purgedCount: number }> {
    if (!session || !session.isAuthenticated || (session.role !== 'admin' && session.role !== 'nadeem')) {
      throw new Error('Unauthorized: Staff access required to purge raw conversation content.');
    }
    const config = getClientConfig();
    if (config.mode === 'backend') {
      const client = getSupabaseClient();
      if (!client) throw new Error('BACKEND_NOT_CONFIGURED');
      const { data, error } = await client.rpc('purge_staged_raw_content', {
        p_batch_id: batchId,
        p_actor_id: session.user?.id,
      });
      if (error) throw new Error(`DATABASE_ERROR: ${error.message}`);
      return { purgedCount: data?.purged_count ?? 0 };
    }

    let purgedCount = 0;
    for (const record of demoStagedRecordsStore) {
      if (record.batchId === batchId && !record.isRawPurged) {
        record.rawContentHash = computeSha256(record.rawContent || '');
        record.rawContent = null;
        record.isRawPurged = true;
        purgedCount++;
      }
    }
    return { purgedCount };
  }
}

export let migrationRepository: IMigrationRepository = new MigrationRepositoryImpl();

export function setMigrationRepositoryForTesting(repo: IMigrationRepository): void {
  migrationRepository = repo;
}

export function resetMigrationRepositoryForTesting(): void {
  demoMigrationBatchesStore = [];
  demoStagedRecordsStore = [];
  migrationRepository = new MigrationRepositoryImpl();
}
