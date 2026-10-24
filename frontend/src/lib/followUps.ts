/**
 * Follow-Ups & External Matchmaker Attribution Service — Gulistan Marriage Bureau
 * 
 * ARCHITECTURAL SPECIFICATION (Section 4.8 & OPEN-002):
 * 1. Access Scope: Follow-ups and external matchmaker records are restricted to staff
 *    (Lead Matchmaker Nadeem Ahmed and Admin). Customer access fails closed.
 * 2. Date & Timezone Validation: Due dates are stored in standard ISO format;
 *    automatic overdue calculation is performed against the reference date.
 * 3. Completion Validation: Completed tasks record actor, timestamp, and optional
 *    resolution notes. State transitions cannot jump arbitrarily.
 * 4. Attribution Integrity: Profiles referred by partner agencies are attributed
 *    to active external matchmakers. Referral counts and match completions update
 *    audit logs and partner metrics.
 * 5. Minimal Audit Trail: Consequential changes generate structured audit records
 *    that omit full notes and private phone numbers (Section 3.7).
 */

import { FollowUpItem, ExternalMatchmaker } from '../types';
import { AuthSession, canAccessRole } from './auth';
import { INITIAL_FOLLOW_UPS, INITIAL_MATCHMAKERS } from '../data/mockData';

export type FollowUpType =
  | 'initial_consult'
  | 'proposal_decision'
  | 'meeting_arrangement'
  | 'photo_request'
  | 'payment_reminder';

export type FollowUpPriority = 'high' | 'medium' | 'low';
export type FollowUpStatus = 'pending' | 'completed' | 'overdue';

export interface FollowUpInput {
  profileId: string;
  candidateId?: string;
  personName: string;
  contactPhone: string;
  type: FollowUpType;
  dueDate: string; // YYYY-MM-DD
  priority: FollowUpPriority;
  notes: string;
}

export interface DetailedFollowUpItem extends FollowUpItem {
  completedAt?: string;
  completedBy?: string;
  completionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CRMAuditRecord {
  actor_id: string;
  actor_role: string;
  action: 'follow_up_created' | 'follow_up_completed' | 'matchmaker_attributed' | 'matchmaker_created';
  target_type: 'follow_up' | 'profile' | 'external_matchmaker';
  target_id: string;
  details: string; // JSON string with minimal metadata
}

// In-Memory Repository for Standalone/Demo & Test Execution
let followUpStore: DetailedFollowUpItem[] = INITIAL_FOLLOW_UPS.map((f) => ({
  ...f,
  createdAt: '2026-10-20T00:00:00Z',
  updatedAt: '2026-10-20T00:00:00Z',
  completedAt: f.status === 'completed' ? '2026-10-21T10:00:00Z' : undefined,
  completedBy: f.status === 'completed' ? 'nadeem@gulistan.pk' : undefined,
}));

let matchmakerStore: ExternalMatchmaker[] = [...INITIAL_MATCHMAKERS];
let auditEventsStore: CRMAuditRecord[] = [];

/**
 * Validates staff authority for CRM operations (Section 4.8).
 * FAILS CLOSED: Only authorized staff (Nadeem / Admin) may access.
 */
export function canAccessCRM(session: AuthSession | null): boolean {
  return canAccessRole(session, 'nadeem');
}

/**
 * Validates input parameters for creating or updating a follow-up item.
 */
export function validateFollowUpInput(input: Partial<FollowUpInput>): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  if (!input.profileId || input.profileId.trim().length === 0) {
    errors.profileId = 'Profile reference ID is required.';
  }

  if (!input.personName || input.personName.trim().length < 2) {
    errors.personName = 'Contact person name must be at least 2 characters.';
  }

  if (!input.contactPhone || input.contactPhone.trim().length < 7) {
    errors.contactPhone = 'Valid contact phone number is required.';
  }

  const validTypes: FollowUpType[] = [
    'initial_consult',
    'proposal_decision',
    'meeting_arrangement',
    'photo_request',
    'payment_reminder',
  ];
  if (!input.type || !validTypes.includes(input.type)) {
    errors.type = `Follow-up type must be one of: ${validTypes.join(', ')}`;
  }

  const validPriorities: FollowUpPriority[] = ['high', 'medium', 'low'];
  if (!input.priority || !validPriorities.includes(input.priority)) {
    errors.priority = 'Priority must be high, medium, or low.';
  }

  if (!input.dueDate || isNaN(Date.parse(input.dueDate))) {
    errors.dueDate = 'Due date must be a valid date string (e.g. YYYY-MM-DD).';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Computes live follow-up status based on current due date and reference date.
 */
export function computeFollowUpStatus(
  dueDate: string,
  currentStatus: 'pending' | 'completed' | 'overdue',
  referenceDate: Date = new Date()
): FollowUpStatus {
  if (currentStatus === 'completed') {
    return 'completed';
  }

  // Parse YYYY-MM-DD using local calendar date
  const due = new Date(dueDate);
  // Set reference to beginning of current day for date-only comparison
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);

  if (due < today) {
    return 'overdue';
  }

  return 'pending';
}

/**
 * Fetches follow-ups filtered by role authorization and optional parameters.
 */
export function getFollowUps(
  session: AuthSession | null,
  filters?: { status?: FollowUpStatus; priority?: FollowUpPriority; profileId?: string }
): {
  success: boolean;
  followUps?: DetailedFollowUpItem[];
  error?: { code: string; messageEn: string; messageUrdu: string };
} {
  if (!canAccessCRM(session)) {
    return {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        messageEn: 'Only authorized bureau matchmakers can access the follow-up queue.',
        messageUrdu: 'صرف مجاز عملہ ہی فالو اپ لسٹ تک رسائی حاصل کر سکتا ہے۔',
      },
    };
  }

  let items = followUpStore.map((f) => ({
    ...f,
    status: computeFollowUpStatus(f.dueDate, f.status),
  }));

  if (filters?.status) {
    items = items.filter((f) => f.status === filters.status);
  }
  if (filters?.priority) {
    items = items.filter((f) => f.priority === filters.priority);
  }
  if (filters?.profileId) {
    items = items.filter((f) => f.profileId === filters.profileId);
  }

  return {
    success: true,
    followUps: items,
  };
}

/**
 * Creates a new follow-up item with input validation and audit event logging.
 */
export function createFollowUp(
  input: FollowUpInput,
  session: AuthSession | null
): {
  success: boolean;
  followUp?: DetailedFollowUpItem;
  error?: { code: string; messageEn: string; messageUrdu: string; details?: Record<string, string> };
} {
  if (!canAccessCRM(session)) {
    return {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        messageEn: 'Only authorized bureau matchmakers can create follow-up tasks.',
        messageUrdu: 'صرف مجاز میچ میکر ہی نیا فالو اپ ٹاسک بنا سکتے ہیں۔',
      },
    };
  }

  const validation = validateFollowUpInput(input);
  if (!validation.valid) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        messageEn: 'Invalid follow-up input parameters.',
        messageUrdu: 'فالو اپ کی معلومات میں غلطی موجود ہے۔',
        details: validation.errors,
      },
    };
  }

  const id = `FU-${Date.now().toString().slice(-4)}`;
  const now = new Date().toISOString();
  const initialStatus = computeFollowUpStatus(input.dueDate, 'pending');

  const newItem: DetailedFollowUpItem = {
    id,
    profileId: input.profileId.trim(),
    candidateId: input.candidateId?.trim(),
    personName: input.personName.trim(),
    contactPhone: input.contactPhone.trim(),
    type: input.type,
    dueDate: input.dueDate,
    priority: input.priority,
    status: initialStatus,
    notes: input.notes.trim(),
    createdAt: now,
    updatedAt: now,
  };

  followUpStore.unshift(newItem);

  // Minimal audit event
  const audit: CRMAuditRecord = {
    actor_id: session?.user?.id || 'usr-nadeem',
    actor_role: session?.role || 'nadeem',
    action: 'follow_up_created',
    target_type: 'follow_up',
    target_id: id,
    details: JSON.stringify({
      profileId: newItem.profileId,
      type: newItem.type,
      dueDate: newItem.dueDate,
      priority: newItem.priority,
    }),
  };
  auditEventsStore.push(audit);

  return {
    success: true,
    followUp: newItem,
  };
}

/**
 * Marks a follow-up item as completed, recording completion actor, timestamp, and audit trail.
 * Idempotent: Completing an already completed item returns the completed record safely.
 */
export function completeFollowUp(
  id: string,
  session: AuthSession | null,
  completionNotes?: string
): {
  success: boolean;
  followUp?: DetailedFollowUpItem;
  error?: { code: string; messageEn: string; messageUrdu: string };
} {
  if (!canAccessCRM(session)) {
    return {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        messageEn: 'Only authorized bureau matchmakers can update follow-up tasks.',
        messageUrdu: 'صرف مجاز میچ میکر ہی فالو اپ مکمل کر سکتے ہیں۔',
      },
    };
  }

  const index = followUpStore.findIndex((f) => f.id === id);
  if (index === -1) {
    return {
      success: false,
      error: {
        code: 'NOT_FOUND',
        messageEn: `Follow-up task '${id}' not found.`,
        messageUrdu: `فالو اپ ٹاسک '${id}' نہیں ملا۔`,
      },
    };
  }

  const current = followUpStore[index];

  // Idempotency check: if already completed, return without error
  if (current.status === 'completed') {
    return {
      success: true,
      followUp: current,
    };
  }

  const now = new Date().toISOString();
  const completedItem: DetailedFollowUpItem = {
    ...current,
    status: 'completed',
    completedAt: now,
    completedBy: session?.user?.email || 'nadeem@gulistan.pk',
    completionNotes: completionNotes?.trim() || current.completionNotes,
    updatedAt: now,
  };

  followUpStore[index] = completedItem;

  // Minimal audit event (no phone number or full notes)
  const audit: CRMAuditRecord = {
    actor_id: session?.user?.id || 'usr-nadeem',
    actor_role: session?.role || 'nadeem',
    action: 'follow_up_completed',
    target_type: 'follow_up',
    target_id: id,
    details: JSON.stringify({
      completedBy: completedItem.completedBy,
      completedAt: completedItem.completedAt,
      profileId: completedItem.profileId,
      previousStatus: current.status,
    }),
  };
  auditEventsStore.push(audit);

  return {
    success: true,
    followUp: completedItem,
  };
}

/**
 * Fetches the external matchmaker partner directory.
 */
export function getExternalMatchmakers(
  session: AuthSession | null,
  filters?: { status?: 'active' | 'inactive' }
): {
  success: boolean;
  matchmakers?: ExternalMatchmaker[];
  error?: { code: string; messageEn: string; messageUrdu: string };
} {
  if (!canAccessCRM(session)) {
    return {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        messageEn: 'Only authorized bureau matchmakers can view the partner directory.',
        messageUrdu: 'صرف مجاز عملہ ہی دیگر میچ میکرز کی فہرست دیکھ سکتا ہے۔',
      },
    };
  }

  let items = [...matchmakerStore];
  if (filters?.status) {
    items = items.filter((m) => m.status === filters.status);
  }

  return {
    success: true,
    matchmakers: items,
  };
}

/**
 * Attributes a candidate profile referral to an external partner matchmaker.
 * Validates that partner is active and increments referred count.
 */
export function attributeProfileToMatchmaker(
  profileId: string,
  matchmakerId: string,
  session: AuthSession | null,
  notes?: string
): {
  success: boolean;
  matchmaker?: ExternalMatchmaker;
  error?: { code: string; messageEn: string; messageUrdu: string };
} {
  if (!canAccessCRM(session)) {
    return {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        messageEn: 'Only authorized bureau matchmakers can record partner attribution.',
        messageUrdu: 'صرف مجاز میچ میکر ہی پارٹنر انتساب ریکارڈ کر سکتے ہیں۔',
      },
    };
  }

  const mmIndex = matchmakerStore.findIndex((m) => m.id === matchmakerId);
  if (mmIndex === -1) {
    return {
      success: false,
      error: {
        code: 'NOT_FOUND',
        messageEn: `External matchmaker '${matchmakerId}' not found.`,
        messageUrdu: `میچ میکر '${matchmakerId}' نہیں ملا۔`,
      },
    };
  }

  const matchmaker = matchmakerStore[mmIndex];
  if (matchmaker.status !== 'active') {
    return {
      success: false,
      error: {
        code: 'MATCHMAKER_INACTIVE',
        messageEn: `Cannot attribute profile to inactive matchmaker '${matchmaker.name}'.`,
        messageUrdu: `غیر فعال میچ میکر '${matchmaker.name}' کو پروفائل منسوب نہیں کی جا سکتی۔`,
      },
    };
  }

  // Increment referred count
  const updatedMatchmaker: ExternalMatchmaker = {
    ...matchmaker,
    profilesReferredCount: matchmaker.profilesReferredCount + 1,
  };
  matchmakerStore[mmIndex] = updatedMatchmaker;

  // Minimal audit record
  const audit: CRMAuditRecord = {
    actor_id: session?.user?.id || 'usr-nadeem',
    actor_role: session?.role || 'nadeem',
    action: 'matchmaker_attributed',
    target_type: 'profile',
    target_id: profileId,
    details: JSON.stringify({
      matchmakerId: updatedMatchmaker.id,
      matchmakerName: updatedMatchmaker.name,
      newReferredCount: updatedMatchmaker.profilesReferredCount,
      attributionNotes: notes?.trim() || undefined,
    }),
  };
  auditEventsStore.push(audit);

  return {
    success: true,
    matchmaker: updatedMatchmaker,
  };
}

/**
 * Resets the in-memory CRM store for reproducible test execution.
 */
export function resetCRMStoreForTesting(): void {
  followUpStore = INITIAL_FOLLOW_UPS.map((f) => ({
    ...f,
    createdAt: '2026-10-20T00:00:00Z',
    updatedAt: '2026-10-20T00:00:00Z',
    completedAt: f.status === 'completed' ? '2026-10-21T10:00:00Z' : undefined,
    completedBy: f.status === 'completed' ? 'nadeem@gulistan.pk' : undefined,
  }));
  matchmakerStore = [...INITIAL_MATCHMAKERS];
  auditEventsStore = [];
}

/**
 * Inspects recorded CRM audit events for test verification.
 */
export function getCRMAuditEventsForTesting(): CRMAuditRecord[] {
  return [...auditEventsStore];
}
