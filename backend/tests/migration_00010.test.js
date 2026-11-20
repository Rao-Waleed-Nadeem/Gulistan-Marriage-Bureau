/**
 * @file migration_00010.test.js
 * @description Automated verification of Migration 00010 (T-037):
 * - Tiered partner commission schema on matchmaker_agreements (P1-33)
 * - Durable referral_attributions table with unique constraint and RLS (P1-34)
 * - Atomic attribute_profile_referral server RPC with status check and deterministic count (P1-34)
 * - Unique partial index on financial_transactions (reversal_of) (P1-36)
 * - Atomic record_financial_reversal server RPC with FOR UPDATE lock and anti-duplicate check (P1-35, P1-36)
 * - Transaction type and status integrity constraints (P1-37)
 * - Zero mock or synthetic candidate data seeding
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const MIGRATION_PATH = resolve(import.meta.dirname, '../migrations/00010_matchmaker_and_finance_enhancements.sql');

test('Migration 00010 exists and is wrapped in a transaction block', () => {
  assert.ok(existsSync(MIGRATION_PATH), '00010_matchmaker_and_finance_enhancements.sql must exist');
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  const sqlWithoutLeadingComments = sql.replace(/^(\s*--[^\n]*\n)*/, '').trim();
  assert.ok(sqlWithoutLeadingComments.startsWith('BEGIN;'), 'Migration must start with BEGIN;');
  assert.ok(sql.trim().endsWith('COMMIT;'), 'Migration must end with COMMIT;');
});

test('Migration 00010 adds tiered_rules JSONB column to matchmaker_agreements (P1-33)', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  assert.match(
    sql,
    /ALTER\s+TABLE\s+public\.matchmaker_agreements\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+tiered_rules\s+JSONB\s+NULL/i,
    'Must add tiered_rules JSONB column to matchmaker_agreements'
  );
});

test('Migration 00010 provisions referral_attributions table with foreign keys, uniqueness, and RLS (P1-34)', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  assert.match(
    sql,
    /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+public\.referral_attributions/i,
    'Must create referral_attributions table'
  );

  assert.ok(
    sql.includes('matchmaker_id UUID NOT NULL REFERENCES public.external_matchmakers(id)'),
    'Must have foreign key to external_matchmakers(id)'
  );

  assert.ok(
    sql.includes('profile_id UUID NOT NULL REFERENCES public.profiles(id)'),
    'Must have foreign key to profiles(id)'
  );

  assert.match(
    sql,
    /CONSTRAINT\s+uq_referral_partner_profile\s+UNIQUE\s*\(\s*matchmaker_id,\s*profile_id\s*\)/i,
    'Must enforce unique candidate-partner referral attribution'
  );

  assert.match(
    sql,
    /ALTER\s+TABLE\s+public\.referral_attributions\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i,
    'Must enable RLS on referral_attributions'
  );

  assert.match(
    sql,
    /CREATE\s+POLICY\s+referral_attributions_staff_select\s+ON\s+public\.referral_attributions/i,
    'Must define staff read policy on referral_attributions'
  );

  assert.match(
    sql,
    /CREATE\s+POLICY\s+referral_attributions_staff_insert\s+ON\s+public\.referral_attributions/i,
    'Must define staff insert policy on referral_attributions'
  );
});

test('Migration 00010 defines atomic attribute_profile_referral RPC with partner validation (P1-34)', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  assert.match(
    sql,
    /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.attribute_profile_referral/i,
    'Must define attribute_profile_referral RPC'
  );

  assert.ok(
    sql.includes('auth_is_staff()'),
    'Must verify staff authorization'
  );

  assert.ok(
    sql.includes("status <> 'active'") || sql.includes("v_mm_status <> 'active'"),
    'Must reject inactive matchmaker'
  );

  assert.ok(
    sql.includes('referral_count = v_current_count') || sql.includes('SELECT COUNT(*)'),
    'Must deterministically count and update referral_count'
  );
});

test('Migration 00010 creates unique partial index on financial_transactions (reversal_of) (P1-36)', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  assert.match(
    sql,
    /CREATE\s+UNIQUE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+uq_financial_transactions_reversal\s+ON\s+public\.financial_transactions\s*\(\s*reversal_of\s*\)\s+WHERE\s+reversal_of\s+IS\s+NOT\s+NULL/i,
    'Must enforce uniqueness on reversal_of'
  );
});

test('Migration 00010 defines atomic record_financial_reversal RPC with row locking (P1-35, P1-36)', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  assert.match(
    sql,
    /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.record_financial_reversal/i,
    'Must define record_financial_reversal RPC'
  );

  assert.ok(
    sql.includes('FOR UPDATE'),
    'Must acquire row lock FOR UPDATE on original transaction'
  );

  assert.ok(
    sql.includes('ALREADY_REVERSED') || sql.includes("v_orig.status = 'reversed'"),
    'Must block reversing already reversed transactions'
  );

  assert.ok(
    sql.includes('CANNOT_REVERSE_REVERSAL') || sql.includes("transaction_type = 'reversal'"),
    'Must block reversing a reversal'
  );

  assert.ok(
    sql.includes("status = 'reversed'"),
    'Must transition original transaction status to reversed'
  );

  assert.ok(
    sql.includes("transaction_type,") && sql.includes("'reversal'"),
    'Must insert reversal transaction'
  );
});

test('Migration 00010 enforces transaction type and status integrity constraints (P1-37)', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  assert.match(
    sql,
    /chk_financial_tx_reversal_status/i,
    'Must enforce chk_financial_tx_reversal_status constraint'
  );
});

test('Migration 00010 does not contain mock or production candidate data seeding', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  assert.doesNotMatch(
    sql,
    /INSERT\s+INTO\s+public\.profiles\s+VALUES/i,
    'Must not seed profiles table'
  );

  assert.doesNotMatch(
    sql,
    /INSERT\s+INTO\s+public\.external_matchmakers\s+VALUES/i,
    'Must not seed external_matchmakers with static records'
  );

  assert.doesNotMatch(
    sql,
    /INSERT\s+INTO\s+public\.financial_transactions\s+VALUES/i,
    'Must not seed financial_transactions with static records'
  );
});
