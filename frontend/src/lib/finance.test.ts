import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  canAccessFinance,
  validateTransactionInput,
  calculatePartnerLedger,
  reconcileLedger,
  getTransactions,
  recordTransaction,
  reverseTransaction,
  resetFinanceStoreForTesting,
  getFinanceAuditEventsForTesting,
  TransactionInput,
  LedgerTransaction,
} from './finance';
import { AuthSession } from './auth';

const staffSession: AuthSession = {
  user: {
    id: 'usr-nadeem',
    email: 'nadeem@gulistan.pk',
    displayName: 'Nadeem Ahmed',
    role: 'nadeem',
    preferredLanguage: 'ur',
  },
  role: 'nadeem',
  token: 'staff-token',
  expiresAt: Date.now() + 3600000,
  isAuthenticated: true,
};

const customerSession: AuthSession = {
  user: {
    id: 'usr-customer',
    email: 'customer@example.com',
    displayName: 'Candidate Family',
    role: 'customer',
    preferredLanguage: 'en',
  },
  role: 'customer',
  token: 'customer-token',
  expiresAt: Date.now() + 3600000,
  isAuthenticated: true,
};

beforeEach(() => {
  resetFinanceStoreForTesting();
});

test('canAccessFinance and getTransactions strictly enforce role boundaries and fail closed for unauthorized users', () => {
  // 1. Unauthenticated
  assert.equal(canAccessFinance(null), false);
  const noAuthGet = getTransactions(null);
  assert.equal(noAuthGet.success, false);
  assert.equal(noAuthGet.error?.code, 'UNAUTHORIZED');

  // 2. Customer role
  assert.equal(canAccessFinance(customerSession), false);
  const customerGet = getTransactions(customerSession);
  assert.equal(customerGet.success, false);
  assert.equal(customerGet.error?.code, 'UNAUTHORIZED');

  // 3. Staff Nadeem
  assert.equal(canAccessFinance(staffSession), true);
  const staffGet = getTransactions(staffSession);
  assert.equal(staffGet.success, true);
  assert.ok(staffGet.transactions && staffGet.transactions.length > 0);
});

test('validateTransactionInput enforces positive integer precision in PKR and validates types', () => {
  // Negative amount
  const negCheck = validateTransactionInput({
    matchmakerId: 'mm-101',
    matchmakerName: 'Haji Aslam',
    amount: -5000,
    type: 'payable',
    date: '2026-10-24',
    description: 'Commission',
  });
  assert.equal(negCheck.valid, false);
  assert.ok(negCheck.errors.amount);

  // Fractional amount (paisa fractions disallowed in bureau operations)
  const floatCheck = validateTransactionInput({
    matchmakerId: 'mm-101',
    matchmakerName: 'Haji Aslam',
    amount: 1500.5,
    type: 'payable',
    date: '2026-10-24',
    description: 'Commission',
  });
  assert.equal(floatCheck.valid, false);
  assert.ok(floatCheck.errors.amount);

  // Missing description and invalid date
  const missingCheck = validateTransactionInput({
    matchmakerId: 'mm-101',
    matchmakerName: 'Haji Aslam',
    amount: 25000,
    type: 'payable',
    date: 'invalid-date',
  });
  assert.equal(missingCheck.valid, false);
  assert.ok(missingCheck.errors.date);
  assert.ok(missingCheck.errors.description);

  // Valid transaction input
  const validCheck = validateTransactionInput({
    matchmakerId: 'mm-101',
    matchmakerName: 'Haji Aslam',
    amount: 25000,
    type: 'payable',
    date: '2026-10-24',
    description: 'Commission payable for GLS-401 match',
  });
  assert.equal(validCheck.valid, true);
  assert.equal(Object.keys(validCheck.errors).length, 0);
});

test('calculatePartnerLedger enforces double-entry sign convention per OPEN-010', () => {
  const transactions: LedgerTransaction[] = [
    {
      id: 'tx-1',
      matchmakerId: 'mm-test',
      matchmakerName: 'Test Agency',
      type: 'payable',
      amount: 40000, // We owe them 40,000
      status: 'pending',
      currency: 'PKR',
      date: '2026-10-20',
      description: 'Consultation fee share',
      createdAt: '2026-10-20T10:00:00Z',
    },
    {
      id: 'tx-2',
      matchmakerId: 'mm-test',
      matchmakerName: 'Test Agency',
      type: 'receivable',
      amount: 15000, // They owe us 15,000
      status: 'pending',
      currency: 'PKR',
      date: '2026-10-21',
      description: 'Client profile registration split',
      createdAt: '2026-10-21T10:00:00Z',
    },
    {
      id: 'tx-3',
      matchmakerId: 'mm-test',
      matchmakerName: 'Test Agency',
      type: 'paid',
      amount: 20000, // Settled payment
      status: 'settled',
      currency: 'PKR',
      date: '2026-10-22',
      description: 'Partial bank settlement',
      createdAt: '2026-10-22T10:00:00Z',
    },
  ];

  const ledger = calculatePartnerLedger('mm-test', 'Test Agency', transactions);

  // Total Pending Payable = 40,000
  assert.equal(ledger.totalPendingPayable, 40000);
  // Total Pending Receivable = 15,000
  assert.equal(ledger.totalPendingReceivable, 15000);
  // Net Balance = 40,000 - 15,000 = 25,000 (Bureau owes partner 25,000 PKR)
  assert.equal(ledger.netBalance, 25000);
  assert.equal(ledger.currency, 'PKR');
  assert.equal(ledger.totalSettledVolume, 20000);
  assert.equal(ledger.activeTransactionCount, 3);
});

test('recordTransaction appends new ledger entry and logs minimal audit record', () => {
  const input: TransactionInput = {
    matchmakerId: 'mm-101',
    matchmakerName: 'Haji Aslam Qureshi',
    type: 'payable',
    amount: 30000,
    description: 'Success commission for Dr. Fatima proposal',
    date: '2026-10-24',
  };

  // Unauthorized call fails
  const unauthRes = recordTransaction(input, customerSession);
  assert.equal(unauthRes.success, false);
  assert.equal(unauthRes.error?.code, 'UNAUTHORIZED');

  // Authorized call succeeds
  const result = recordTransaction(input, staffSession);
  assert.equal(result.success, true);
  assert.ok(result.transaction);
  assert.equal(result.transaction.amount, 30000);
  assert.equal(result.transaction.currency, 'PKR');
  assert.equal(result.transaction.status, 'pending');

  // Verify audit event
  const audits = getFinanceAuditEventsForTesting();
  const txAudit = audits.find((a) => a.action === 'financial_transaction_recorded' && a.target_id === result.transaction?.id);
  assert.ok(txAudit);
  assert.equal(txAudit.target_type, 'financial_transaction');

  const details = JSON.parse(txAudit.details);
  assert.equal(details.matchmakerId, 'mm-101');
  assert.equal(details.amount, 30000);
  assert.equal(details.currency, 'PKR');
});

test('reverseTransaction preserves historical entry, appends reversal, and reconciles balances', () => {
  // 1. Record an initial transaction of 50,000 PKR payable
  const recordRes = recordTransaction(
    {
      matchmakerId: 'mm-rev-test',
      matchmakerName: 'Test Agency',
      type: 'payable',
      amount: 50000,
      description: 'Erroneous duplicate entry',
      date: '2026-10-24',
    },
    staffSession
  );
  assert.ok(recordRes.transaction);
  const origId = recordRes.transaction.id;

  // Verify initial ledger balance is 50,000
  const allTxBefore = getTransactions(staffSession).transactions || [];
  const ledgerBefore = calculatePartnerLedger('mm-rev-test', 'Test Agency', allTxBefore);
  assert.equal(ledgerBefore.netBalance, 50000);

  // 2. Reverse the transaction with reason
  const revRes = reverseTransaction(origId, 'Duplicate billing created in error', staffSession);
  assert.equal(revRes.success, true);
  assert.ok(revRes.reversalTransaction);
  assert.equal(revRes.reversalTransaction.type, 'reversal');
  assert.equal(revRes.reversalTransaction.reversalOf, origId);

  // 3. Verify original transaction still exists in store but is marked reversed
  const allTxAfter = getTransactions(staffSession).transactions || [];
  const originalInStore = allTxAfter.find((t) => t.id === origId);
  assert.ok(originalInStore, 'Historical entry must NEVER be deleted');
  assert.equal(originalInStore.status, 'reversed');

  // 4. Verify partner ledger balance reconciles back to 0
  const ledgerAfter = calculatePartnerLedger('mm-rev-test', 'Test Agency', allTxAfter);
  assert.equal(ledgerAfter.netBalance, 0);
  assert.equal(ledgerAfter.reversedTransactionCount, 1);

  // 5. Attempting to reverse again fails (prevents duplicate reversal)
  const duplicateRev = reverseTransaction(origId, 'Second attempt', staffSession);
  assert.equal(duplicateRev.success, false);
  assert.equal(duplicateRev.error?.code, 'ALREADY_REVERSED');
});

test('reconcileLedger verifies total global bureau balances and net liabilities', () => {
  const transactions: LedgerTransaction[] = [
    {
      id: 'tx-a',
      matchmakerId: 'mm-1',
      matchmakerName: 'Agent 1',
      type: 'payable',
      amount: 60000,
      status: 'pending',
      currency: 'PKR',
      date: '2026-10-24',
      description: 'Payable',
      createdAt: '2026-10-24T10:00:00Z',
    },
    {
      id: 'tx-b',
      matchmakerId: 'mm-2',
      matchmakerName: 'Agent 2',
      type: 'receivable',
      amount: 25000,
      status: 'pending',
      currency: 'PKR',
      date: '2026-10-24',
      description: 'Receivable',
      createdAt: '2026-10-24T10:00:00Z',
    },
    {
      id: 'tx-c',
      matchmakerId: 'mm-1',
      matchmakerName: 'Agent 1',
      type: 'paid',
      amount: 10000,
      status: 'settled',
      currency: 'PKR',
      date: '2026-10-24',
      description: 'Settled',
      createdAt: '2026-10-24T10:00:00Z',
    },
  ];

  const reconciliation = reconcileLedger(transactions);
  assert.equal(reconciliation.reconciled, true);
  assert.equal(reconciliation.totalPayablePending, 60000);
  assert.equal(reconciliation.totalReceivablePending, 25000);
  // Net Bureau liability = 60,000 - 25,000 = 35,000 PKR
  assert.equal(reconciliation.netBureauLiability, 35000);
  assert.equal(reconciliation.totalSettledPaid, 10000);
  assert.equal(reconciliation.totalTransactionsCount, 3);
});
