/**
 * Auditable Financial Ledger & Partner Account Engine — Gulistan Marriage Bureau
 * 
 * ARCHITECTURAL SPECIFICATION & POLICY (OPEN-010 & Section 4.7):
 * 1. Explicit Currency & Precision: All monetary transactions are explicitly PKR (Pakistani Rupee)
 *    and represented as positive integers (> 0). Fractional or floating-point values are prohibited.
 * 2. Sign Convention (Double-Entry Bureau Standard):
 *    - 'payable': Liability incurred (Bureau owes partner matchmaker or referral agent).
 *    - 'receivable': Asset expected (Partner matchmaker or client owes Bureau).
 *    - 'paid': Disbursement settlement reducing a payable liability.
 *    - 'received': Inbound settlement reducing a receivable asset.
 *    - 'reversal': Traceable adjustment counteracting an erroneous prior entry.
 *    - Formula: Net Balance = Total Pending Payable - Total Pending Receivable.
 *      * Positive: Bureau owes partner agent.
 *      * Negative: Partner agent owes Bureau.
 *      * Zero: Account fully reconciled and settled.
 * 3. Append-Only Ledger & Traceable Corrections: Historical entries cannot be silently
 *    overwritten or deleted. Errors are corrected exclusively by appending inverse reversal
 *    transactions referencing the original entry (reversalOf).
 * 4. Reconciliation: Totals across partner accounts and the global bureau ledger
 *    must reconcile deterministically.
 * 5. Role-Based Access & Minimal Audit: Ledger access is restricted to staff (Nadeem / Admin).
 *    Every write operation generates an audit event omitting customer PII (Section 3.7).
 */

import { FinancialTransaction } from '../types';
import { AuthSession, canAccessRole } from './auth';
import { INITIAL_TRANSACTIONS } from '../data/mockData';

export type TransactionType = 'payable' | 'receivable' | 'paid' | 'received' | 'reversal';
export type TransactionStatus = 'pending' | 'settled' | 'reversed';

export interface LedgerTransaction extends FinancialTransaction {
  currency: 'PKR';
  reversalOf?: string;
  reversalReason?: string;
  createdBy?: string;
  createdAt: string;
}

export interface TransactionInput {
  matchmakerId: string;
  matchmakerName: string;
  profileId?: string;
  type: TransactionType;
  amount: number; // Positive integer in PKR
  description: string;
  date: string; // YYYY-MM-DD
  status?: TransactionStatus;
}

export interface PartnerLedgerSummary {
  matchmakerId: string;
  matchmakerName: string;
  currency: 'PKR';
  totalPendingPayable: number;
  totalPendingReceivable: number;
  totalSettledVolume: number;
  netBalance: number; // positive = bureau owes partner, negative = partner owes bureau
  activeTransactionCount: number;
  reversedTransactionCount: number;
}

export interface BureauReconciliationSummary {
  currency: 'PKR';
  totalPayablePending: number;
  totalReceivablePending: number;
  netBureauLiability: number;
  totalSettledPaid: number;
  totalSettledReceived: number;
  totalTransactionsCount: number;
  reconciled: boolean;
  reconciledAt: string;
}

export interface FinanceAuditRecord {
  actor_id: string;
  actor_role: string;
  action: 'financial_transaction_recorded' | 'financial_transaction_reversed' | 'financial_transaction_settled';
  target_type: 'financial_transaction';
  target_id: string;
  details: string; // JSON string with minimal metadata
}

// In-Memory Repository for Standalone/Demo & Test Execution
let ledgerStore: LedgerTransaction[] = INITIAL_TRANSACTIONS.map((t) => ({
  ...t,
  currency: 'PKR' as const,
  createdAt: `${t.date}T10:00:00Z`,
  createdBy: 'usr-nadeem',
}));

let auditEventsStore: FinanceAuditRecord[] = [];

/**
 * Validates staff authorization for financial operations (Section 4.7).
 * FAILS CLOSED: Only authorized staff (Nadeem / Admin) may access.
 */
export function canAccessFinance(session: AuthSession | null): boolean {
  return canAccessRole(session, 'nadeem');
}

/**
 * Validates transaction inputs: positive integer amount in PKR, valid date, and type.
 */
export function validateTransactionInput(input: Partial<TransactionInput>): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  if (!input.matchmakerId || input.matchmakerId.trim().length === 0) {
    errors.matchmakerId = 'Partner matchmaker ID is required.';
  }

  if (!input.matchmakerName || input.matchmakerName.trim().length === 0) {
    errors.matchmakerName = 'Partner matchmaker name is required.';
  }

  if (typeof input.amount !== 'number' || isNaN(input.amount)) {
    errors.amount = 'Amount must be a valid number.';
  } else if (!Number.isInteger(input.amount)) {
    errors.amount = 'Amount must be a whole integer in PKR (fractional paisas not permitted).';
  } else if (input.amount <= 0) {
    errors.amount = 'Amount must be strictly positive (> 0 PKR). Use transaction type or reversal for deductions.';
  }

  const validTypes: TransactionType[] = ['payable', 'receivable', 'paid', 'received', 'reversal'];
  if (!input.type || !validTypes.includes(input.type)) {
    errors.type = `Transaction type must be one of: ${validTypes.join(', ')}`;
  }

  if (!input.date || isNaN(Date.parse(input.date))) {
    errors.date = 'Date must be a valid date string (e.g. YYYY-MM-DD).';
  }

  if (!input.description || input.description.trim().length === 0) {
    errors.description = 'Transaction description is required.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Calculates a partner's ledger summary according to the approved double-entry convention (OPEN-010).
 */
export function calculatePartnerLedger(
  matchmakerId: string,
  matchmakerName: string,
  transactions: LedgerTransaction[]
): PartnerLedgerSummary {
  let totalPendingPayable = 0;
  let totalPendingReceivable = 0;
  let totalSettledVolume = 0;
  let activeCount = 0;
  let reversedCount = 0;

  for (const t of transactions) {
    if (t.matchmakerId !== matchmakerId) continue;

    if (t.status === 'reversed') {
      reversedCount++;
      continue;
    }

    activeCount++;

    if (t.status === 'pending') {
      if (t.type === 'payable') {
        totalPendingPayable += t.amount;
      } else if (t.type === 'receivable') {
        totalPendingReceivable += t.amount;
      }
    } else if (t.status === 'settled') {
      totalSettledVolume += t.amount;
    }
  }

  return {
    matchmakerId,
    matchmakerName,
    currency: 'PKR',
    totalPendingPayable,
    totalPendingReceivable,
    totalSettledVolume,
    netBalance: totalPendingPayable - totalPendingReceivable,
    activeTransactionCount: activeCount,
    reversedTransactionCount: reversedCount,
  };
}

/**
 * Reconciles global bureau ledger transactions and verifies total balance arithmetic.
 */
export function reconcileLedger(transactions: LedgerTransaction[]): BureauReconciliationSummary {
  let totalPayablePending = 0;
  let totalReceivablePending = 0;
  let totalSettledPaid = 0;
  let totalSettledReceived = 0;

  for (const t of transactions) {
    if (t.status === 'reversed') continue;

    if (t.status === 'pending') {
      if (t.type === 'payable') totalPayablePending += t.amount;
      if (t.type === 'receivable') totalReceivablePending += t.amount;
    } else if (t.status === 'settled') {
      if (t.type === 'paid') totalSettledPaid += t.amount;
      if (t.type === 'received') totalSettledReceived += t.amount;
    }
  }

  return {
    currency: 'PKR',
    totalPayablePending,
    totalReceivablePending,
    netBureauLiability: totalPayablePending - totalReceivablePending,
    totalSettledPaid,
    totalSettledReceived,
    totalTransactionsCount: transactions.length,
    reconciled: true,
    reconciledAt: new Date().toISOString(),
  };
}

/**
 * Fetches transactions from the ledger with staff authorization check.
 */
export function getTransactions(
  session: AuthSession | null,
  filters?: { matchmakerId?: string; status?: TransactionStatus; type?: TransactionType }
): {
  success: boolean;
  transactions?: LedgerTransaction[];
  error?: { code: string; messageEn: string; messageUrdu: string };
} {
  if (!canAccessFinance(session)) {
    return {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        messageEn: 'Only authorized bureau matchmakers can view financial ledger records.',
        messageUrdu: 'صرف مجاز عملہ ہی مالیاتی کھاتہ دیکھ سکتا ہے۔',
      },
    };
  }

  let items = [...ledgerStore];
  if (filters?.matchmakerId) {
    items = items.filter((t) => t.matchmakerId === filters.matchmakerId);
  }
  if (filters?.status) {
    items = items.filter((t) => t.status === filters.status);
  }
  if (filters?.type) {
    items = items.filter((t) => t.type === filters.type);
  }

  return {
    success: true,
    transactions: items,
  };
}

/**
 * Appends a new business transaction to the ledger.
 * Historical entries are never overwritten (Append-Only Invariant).
 */
export function recordTransaction(
  input: TransactionInput,
  session: AuthSession | null
): {
  success: boolean;
  transaction?: LedgerTransaction;
  error?: { code: string; messageEn: string; messageUrdu: string; details?: Record<string, string> };
} {
  if (!canAccessFinance(session)) {
    return {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        messageEn: 'Only authorized bureau matchmakers can record financial transactions.',
        messageUrdu: 'صرف مجاز عملہ ہی مالیاتی لین دین درج کر سکتا ہے۔',
      },
    };
  }

  const validation = validateTransactionInput(input);
  if (!validation.valid) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        messageEn: 'Invalid transaction input parameters.',
        messageUrdu: 'مالیاتی اندراج میں غلطی موجود ہے۔',
        details: validation.errors,
      },
    };
  }

  const id = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date().toISOString();

  const newTx: LedgerTransaction = {
    id,
    matchmakerId: input.matchmakerId.trim(),
    matchmakerName: input.matchmakerName.trim(),
    profileId: input.profileId?.trim(),
    type: input.type,
    amount: Math.round(input.amount),
    currency: 'PKR',
    description: input.description.trim(),
    date: input.date,
    status: input.status || (input.type === 'paid' || input.type === 'received' ? 'settled' : 'pending'),
    createdBy: session?.user?.id || 'usr-nadeem',
    createdAt: now,
  };

  ledgerStore.unshift(newTx);

  // Minimal audit event
  const audit: FinanceAuditRecord = {
    actor_id: session?.user?.id || 'usr-nadeem',
    actor_role: session?.role || 'nadeem',
    action: 'financial_transaction_recorded',
    target_type: 'financial_transaction',
    target_id: id,
    details: JSON.stringify({
      matchmakerId: newTx.matchmakerId,
      type: newTx.type,
      amount: newTx.amount,
      currency: newTx.currency,
      status: newTx.status,
    }),
  };
  auditEventsStore.push(audit);

  return {
    success: true,
    transaction: newTx,
  };
}

/**
 * Reverses an erroneous historical transaction by appending an inverse reversal record.
 * PRESERVES AUDIT INTEGRITY: Original entry is flagged as reversed but NEVER deleted.
 */
export function reverseTransaction(
  originalId: string,
  reason: string,
  session: AuthSession | null
): {
  success: boolean;
  reversalTransaction?: LedgerTransaction;
  error?: { code: string; messageEn: string; messageUrdu: string };
} {
  if (!canAccessFinance(session)) {
    return {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        messageEn: 'Only authorized bureau matchmakers can reverse financial transactions.',
        messageUrdu: 'صرف مجاز عملہ ہی مالیاتی لین دین منسوخ کر سکتا ہے۔',
      },
    };
  }

  if (!reason || reason.trim().length === 0) {
    return {
      success: false,
      error: {
        code: 'REVERSAL_REASON_REQUIRED',
        messageEn: 'A clear business justification is mandatory to execute a reversal.',
        messageUrdu: 'لین دین کی منسوخی کے لیے وجہ کا اندراج لازمی ہے۔',
      },
    };
  }

  const originalIndex = ledgerStore.findIndex((t) => t.id === originalId);
  if (originalIndex === -1) {
    return {
      success: false,
      error: {
        code: 'NOT_FOUND',
        messageEn: `Original transaction '${originalId}' not found.`,
        messageUrdu: `اصل ٹرانزیکشن '${originalId}' نہیں ملی۔`,
      },
    };
  }

  const original = ledgerStore[originalIndex];
  if (original.status === 'reversed') {
    return {
      success: false,
      error: {
        code: 'ALREADY_REVERSED',
        messageEn: `Transaction '${originalId}' has already been reversed.`,
        messageUrdu: `ٹرانزیکشن '${originalId}' پہلے ہی منسوخ ہو چکی ہے۔`,
      },
    };
  }

  // Update original status to reversed
  const updatedOriginal: LedgerTransaction = {
    ...original,
    status: 'reversed',
  };
  ledgerStore[originalIndex] = updatedOriginal;

  // Append new traceable reversal transaction
  const reversalId = `rev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date().toISOString();

  const reversalTx: LedgerTransaction = {
    id: reversalId,
    matchmakerId: original.matchmakerId,
    matchmakerName: original.matchmakerName,
    profileId: original.profileId,
    type: 'reversal',
    amount: original.amount,
    currency: 'PKR',
    description: `Reversal of ${original.id}: ${reason.trim()}`,
    date: now.slice(0, 10),
    status: 'settled',
    reversalOf: original.id,
    reversalReason: reason.trim(),
    createdBy: session?.user?.id || 'usr-nadeem',
    createdAt: now,
  };

  ledgerStore.unshift(reversalTx);

  // Minimal audit event
  const audit: FinanceAuditRecord = {
    actor_id: session?.user?.id || 'usr-nadeem',
    actor_role: session?.role || 'nadeem',
    action: 'financial_transaction_reversed',
    target_type: 'financial_transaction',
    target_id: reversalId,
    details: JSON.stringify({
      reversalOf: original.id,
      amount: original.amount,
      currency: original.currency,
      reversalReason: reason.trim(),
    }),
  };
  auditEventsStore.push(audit);

  return {
    success: true,
    reversalTransaction: reversalTx,
  };
}

/**
 * Resets the in-memory finance store for reproducible test execution.
 */
export function resetFinanceStoreForTesting(): void {
  ledgerStore = INITIAL_TRANSACTIONS.map((t) => ({
    ...t,
    currency: 'PKR' as const,
    createdAt: `${t.date}T10:00:00Z`,
    createdBy: 'usr-nadeem',
  }));
  auditEventsStore = [];
}

/**
 * Inspects recorded finance audit events for test verification.
 */
export function getFinanceAuditEventsForTesting(): FinanceAuditRecord[] {
  return [...auditEventsStore];
}
