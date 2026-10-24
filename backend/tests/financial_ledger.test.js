import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATION_00002_PATH = path.resolve(__dirname, '../migrations/00002_financial_ledger.sql');
const FINANCE_CODE_PATH = path.resolve(__dirname, '../../frontend/src/lib/finance.ts');
const OPEN_DECISIONS_PATH = path.resolve(__dirname, '../docs/09-open-decisions.md');

test('Migration 00002 exists, is transaction-wrapped, and creates financial_transactions table', () => {
  assert.ok(fs.existsSync(MIGRATION_00002_PATH), 'Migration 00002 must exist');
  const sql = fs.readFileSync(MIGRATION_00002_PATH, 'utf8');

  assert.ok(sql.includes('BEGIN;'), 'Migration must begin with transaction block');
  assert.ok(sql.includes('COMMIT;'), 'Migration must end with COMMIT');
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.financial_transactions'), 'Must create financial_transactions table');
});

test('Financial transactions table enforces PKR currency and positive amount constraints', () => {
  const sql = fs.readFileSync(MIGRATION_00002_PATH, 'utf8');

  assert.ok(sql.includes("CONSTRAINT chk_financial_tx_currency CHECK (currency = 'PKR')"), 'Must enforce currency = PKR');
  assert.ok(sql.includes('CONSTRAINT chk_financial_tx_amount_positive CHECK (amount_pkr > 0)'), 'Must enforce amount > 0');
  assert.ok(sql.includes("CONSTRAINT chk_financial_tx_type CHECK (transaction_type IN ('payable', 'receivable', 'paid', 'received', 'reversal'))"), 'Must check transaction types');
  assert.ok(sql.includes('reversal_of UUID NULL REFERENCES public.financial_transactions(id)'), 'Must define foreign key for reversals');
});

test('Financial transactions table enforces append-only RLS and strictly forbids UPDATE/DELETE policies', () => {
  const sql = fs.readFileSync(MIGRATION_00002_PATH, 'utf8');

  // RLS enablement
  assert.ok(sql.includes('ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;'), 'Must enable RLS');
  assert.ok(sql.includes('REVOKE ALL ON TABLE public.financial_transactions FROM public, anon;'), 'Must revoke public/anon access');

  // Staff policies
  assert.ok(sql.includes('CREATE POLICY financial_tx_staff_select'), 'Must have staff SELECT policy');
  assert.ok(sql.includes('CREATE POLICY financial_tx_staff_insert'), 'Must have staff INSERT policy');

  // Append-only invariant: NO UPDATE or DELETE policies
  assert.ok(!sql.includes('CREATE POLICY financial_tx_staff_update'), 'Must NOT have UPDATE policy');
  assert.ok(!sql.includes('CREATE POLICY financial_tx_staff_delete'), 'Must NOT have DELETE policy');
});

test('Finance engine service enforces OPEN-010 double-entry conventions and traceable reversals', () => {
  const code = fs.readFileSync(FINANCE_CODE_PATH, 'utf8');

  assert.ok(code.includes('calculatePartnerLedger'), 'Must export calculatePartnerLedger');
  assert.ok(code.includes('totalPendingPayable - totalPendingReceivable'), 'Must compute net balance as payable - receivable per OPEN-010');
  assert.ok(code.includes('reverseTransaction'), 'Must export reverseTransaction');
  assert.ok(code.includes('reconcileLedger'), 'Must export reconcileLedger');
});

test('Open decisions document records DECIDED status for OPEN-010', () => {
  const docs = fs.readFileSync(OPEN_DECISIONS_PATH, 'utf8');

  assert.ok(docs.includes('| OPEN-010 | Matchmaker finance semantics | DECIDED |'), 'OPEN-010 must be DECIDED');
});
