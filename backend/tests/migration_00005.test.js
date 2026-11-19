/**
 * @file migration_00005.test.js
 * @description Automated verification of Migration 00005 (T-032):
 * - Customer profile ownership (account_id) and self-service intake policy (P0-03, P0-15)
 * - Consent schema corrections: dropping forced true constraints and defaults (P0-04)
 * - Database-enforced profile status state machine trigger and automatic status history (P0-05)
 * - Audit trail least-privilege insert policy and trusted RPC (P0-13, P0-14)
 * - Account status enforcement (active vs suspended / pending_verification) in RLS (P0-16)
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const MIGRATION_PATH = resolve(import.meta.dirname, '../migrations/00005_auth_lifecycle_ownership_and_audit.sql');

test('Migration 00005 exists and is wrapped in a transaction block', () => {
  assert.ok(existsSync(MIGRATION_PATH), '00005_auth_lifecycle_ownership_and_audit.sql must exist');
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  const sqlWithoutLeadingComments = sql.replace(/^(\s*--[^\n]*\n)*/, '').trim();
  assert.ok(sqlWithoutLeadingComments.startsWith('BEGIN;'), 'Migration must start with BEGIN;');
  assert.ok(sql.trim().endsWith('COMMIT;'), 'Migration must end with COMMIT;');
});

test('Migration 00005 adds account_id column and index to public.profiles (P0-03, P0-15)', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  assert.match(
    sql,
    /ALTER\s+TABLE\s+public\.profiles\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+account_id\s+UUID/i,
    'Must add account_id UUID column to public.profiles'
  );

  assert.match(
    sql,
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_profiles_account_id\s+ON\s+public\.profiles/i,
    'Must create index on account_id'
  );
});

test('Migration 00005 implements auth_is_account_active and updates auth_is_staff (P0-16)', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  assert.match(
    sql,
    /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.auth_is_account_active/i,
    'Must define auth_is_account_active function'
  );

  assert.match(
    sql,
    /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.auth_is_staff/i,
    'Must define updated auth_is_staff checking account_status'
  );

  assert.ok(
    sql.includes('account_status IN (\'suspended\', \'pending_verification\')'),
    'auth_is_account_active must reject suspended and pending_verification accounts'
  );
});

test('Migration 00005 implements customer self-service intake policy on profiles (P0-03)', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  assert.match(
    sql,
    /CREATE\s+POLICY\s+profiles_customer_insert\s+ON\s+public\.profiles/i,
    'Must define customer insert policy'
  );

  assert.ok(
    sql.includes("account_id = auth.uid()"),
    'Customer insert must bind account_id to authenticated caller'
  );

  assert.ok(
    sql.includes("source = 'direct_web'"),
    'Customer insert must restrict source to direct_web'
  );

  assert.ok(
    sql.includes("status = 'pending_review'"),
    'Customer insert must restrict status to pending_review'
  );
});

test('Migration 00005 fixes consent schema contradictions and false defaults (P0-04)', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  assert.match(
    sql,
    /DROP\s+CONSTRAINT\s+IF\s+EXISTS\s+chk_profiles_consent_certified/i,
    'Must drop contradictory check constraint on profiles'
  );

  assert.match(
    sql,
    /ALTER\s+COLUMN\s+is_granted\s+DROP\s+DEFAULT/i,
    'Must drop automatic TRUE default on candidate_consents.is_granted'
  );

  assert.match(
    sql,
    /ALTER\s+COLUMN\s+certified_at\s+DROP\s+DEFAULT/i,
    'Must drop automatic default on candidate_consents.certified_at'
  );

  assert.match(
    sql,
    /ADD\s+CONSTRAINT\s+chk_consent_status\s+CHECK\s+\(status\s+IN\s+\('granted',\s*'withdrawn',\s*'pending',\s*'expired'\)\)/i,
    'Must add consent status check constraint'
  );
});

test('Migration 00005 enforces profile lifecycle state machine via trigger (P0-05)', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  assert.match(
    sql,
    /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.validate_profile_status_transition/i,
    'Must define validate_profile_status_transition function'
  );

  assert.match(
    sql,
    /CREATE\s+TRIGGER\s+trg_profile_status_lifecycle/i,
    'Must create trg_profile_status_lifecycle trigger on public.profiles'
  );

  assert.ok(
    sql.includes('INSERT INTO public.profile_status_history'),
    'Trigger function must record auditable transition in profile_status_history'
  );

  assert.ok(
    sql.includes('RAISE EXCEPTION'),
    'Trigger function must raise exception on illegal state transitions'
  );
});

test('Migration 00005 enforces audit event integrity and least privilege (P0-13, P0-14)', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  assert.match(
    sql,
    /CREATE\s+POLICY\s+audit_events_insert\s+ON\s+public\.audit_events/i,
    'Must recreate audit_events_insert policy'
  );

  assert.ok(
    sql.includes('actor_id = auth.uid()'),
    'Audit insert must strictly enforce actor_id = auth.uid()'
  );

  // Policy check: policy block must NOT permit actor_id IS NULL
  const policyMatch = sql.match(/CREATE\s+POLICY\s+audit_events_insert[\s\S]*?;/i);
  assert.ok(policyMatch, 'audit_events_insert policy must be present');
  assert.ok(
    !policyMatch[0].includes('actor_id IS NULL'),
    'Policy must NOT permit authenticated inserts with actor_id IS NULL'
  );

  assert.match(
    sql,
    /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.record_audit_event/i,
    'Must define record_audit_event trusted security definer RPC'
  );
});

test('Migration 00005 does not contain mock or production candidate data seeding', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  assert.ok(!sql.includes("INSERT INTO public.profiles"), 'Must not seed candidate profiles');
  assert.ok(!sql.includes("INSERT INTO public.user_roles"), 'Must not seed mock credentials');
  assert.ok(!sql.includes("@example.com"), 'Must not contain test email fixtures');
});
