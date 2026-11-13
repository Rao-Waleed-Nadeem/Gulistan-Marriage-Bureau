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
} from '../types';
import { FinancialTransaction } from '../utils/finance';
import { AuthSession, canAccessRole } from './auth';
import { getClientConfig } from './config';
import { getSupabaseClient } from './supabaseClient';
import {
  ProfileRow,
  profileRowToDTO,
  profileDTOToRow,
  sanitizeProfileForRole,
  validateProfileInput,
  canTransitionStatus,
} from './profiles';
import { INITIAL_PROFILES, INITIAL_FOLLOW_UPS, INITIAL_TRANSACTIONS } from '../data/mockData';

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
  findAll(session: AuthSession | null): Promise<FinancialTransaction[]>;
  record(txData: Partial<FinancialTransaction>, session: AuthSession | null): Promise<FinancialTransaction>;
  reverse(id: string, reason: string, session: AuthSession | null): Promise<FinancialTransaction>;
}

export interface ICRMRepository {
  findAll(session: AuthSession | null): Promise<FollowUpItem[]>;
  create(itemData: Partial<FollowUpItem>, session: AuthSession | null): Promise<FollowUpItem>;
  complete(id: string, session: AuthSession | null): Promise<FollowUpItem>;
}

// =============================================================================
// In-Memory Demo Storage (Isolated to local development & tests)
// =============================================================================

let demoProfilesStore: ProfileRecord[] = [...INITIAL_PROFILES];
let demoTransactionsStore: FinancialTransaction[] = [...INITIAL_TRANSACTIONS];
let demoFollowUpsStore: FollowUpItem[] = [...INITIAL_FOLLOW_UPS];

export function resetRepositoriesForTesting(): void {
  demoProfilesStore = [...INITIAL_PROFILES];
  demoTransactionsStore = [...INITIAL_TRANSACTIONS];
  demoFollowUpsStore = [...INITIAL_FOLLOW_UPS];
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
  async findAll(session: AuthSession | null): Promise<FinancialTransaction[]> {
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
        .order('created_at', { ascending: false });

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

    return [...demoTransactionsStore];
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
        .eq('reference_code', id)
        .single();

      if (fetchErr || !original) throw new Error(`NOT_FOUND: Transaction ${id} not found.`);

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
        reversal_reason: reason,
        description: `Reversal of ${id}: ${reason}`,
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
        description: `Reversal of ${id}: ${reason}`,
        date: now,
        reversalOf: original.reference_code,
        reversalReason: reason,
      };
    }

    const original = demoTransactionsStore.find((t) => t.id === id);
    if (!original) throw new Error(`NOT_FOUND: Transaction ${id} not found.`);

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
      description: `Reversal of ${id}: ${reason}`,
      date: now,
      reversalOf: original.id,
      reversalReason: reason,
    };

    demoTransactionsStore = [reversalTx, ...demoTransactionsStore];
    return reversalTx;
  }
}

// =============================================================================
// CRM Follow-Up Repository Implementation
// =============================================================================

class CRMRepositoryImpl implements ICRMRepository {
  async findAll(session: AuthSession | null): Promise<FollowUpItem[]> {
    if (!canAccessRole(session, 'nadeem')) {
      throw new Error('UNAUTHORIZED: Only bureau staff can access CRM follow-ups.');
    }

    const config = getClientConfig();

    if (config.mode === 'backend') {
      const client = getSupabaseClient();
      if (!client) throw new Error('BACKEND_NOT_CONFIGURED');

      const { data, error } = await client
        .from('crm_follow_ups')
        .select('*')
        .order('scheduled_date', { ascending: true });

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

    return [...demoFollowUpsStore];
  }

  async create(itemData: Partial<FollowUpItem>, session: AuthSession | null): Promise<FollowUpItem> {
    if (!canAccessRole(session, 'nadeem')) {
      throw new Error('UNAUTHORIZED: Only bureau staff can create CRM follow-ups.');
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

  async complete(id: string, session: AuthSession | null): Promise<FollowUpItem> {
    if (!canAccessRole(session, 'nadeem')) {
      throw new Error('UNAUTHORIZED: Only bureau staff can complete CRM follow-ups.');
    }

    const config = getClientConfig();

    if (config.mode === 'backend') {
      const client = getSupabaseClient();
      if (!client) throw new Error('BACKEND_NOT_CONFIGURED');

      const { data, error } = await client
        .from('crm_follow_ups')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: session?.user?.id || null,
        })
        .eq('reference_code', id)
        .select()
        .single();

      if (error || !data) throw new Error(`DATABASE_ERROR: ${error?.message}`);

      return {
        id: data.reference_code,
        profileId: data.profile_id || '',
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

    item.status = 'completed';
    return item;
  }
}

// =============================================================================
// Singleton Instances & Testing Hooks
// =============================================================================

export let profileRepository: IProfileRepository = new ProfileRepositoryImpl();
export let financeRepository: IFinanceRepository = new FinanceRepositoryImpl();
export let crmRepository: ICRMRepository = new CRMRepositoryImpl();

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
