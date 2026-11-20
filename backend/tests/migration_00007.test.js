/**
 * @file migration_00007.test.js
 * @description Automated verification of Migration 00007 (T-034):
 * - Private storage bucket definition and storage.objects RLS policies (P0-07, P1-25)
 * - Share grants schema enhancement (match_case_id, immutable snapshot) (P0-08, P1-27)
 * - Atomic server RPCs: create_share_grant, redeem_share_grant, revoke_share_grant
 * - Server-side atomic candidate privacy erasure & photo purge (P0-07, P1-28)
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const MIGRATION_PATH = resolve(import.meta.dirname, '../migrations/00007_storage_and_share_grants_enhancements.sql');

test('Migration 00007 exists and is wrapped in a transaction block', () => {
  assert.ok(existsSync(MIGRATION_PATH), '00007_storage_and_share_grants_enhancements.sql must exist');
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  const sqlWithoutLeadingComments = sql.replace(/^(\s*--[^\n]*\n)*/, '').trim();
  assert.ok(sqlWithoutLeadingComments.startsWith('BEGIN;'), 'Migration must start with BEGIN;');
  assert.ok(sql.trim().endsWith('COMMIT;'), 'Migration must end with COMMIT;');
});

test('Migration 00007 creates candidate-photos private bucket and storage RLS policies (P0-07, P1-25)', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  // Verify candidate-photos bucket definition
  assert.ok(
    sql.includes("'candidate-photos'"),
    'Must define candidate-photos bucket'
  );
  assert.match(
    sql,
    /public\s*=\s*FALSE/i,
    'candidate-photos bucket must be strictly private (public = FALSE)'
  );
  assert.ok(
    sql.includes('5242880'),
    'candidate-photos bucket must enforce 5MB limit'
  );

  // Verify RLS enablement
  assert.match(
    sql,
    /ALTER\s+TABLE\s+storage\.objects\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i,
    'Must enable RLS on storage.objects'
  );

  // Verify revocation from public and anon
  assert.match(
    sql,
    /REVOKE\s+ALL\s+ON\s+TABLE\s+storage\.objects\s+FROM\s+public,\s*anon/i,
    'Must revoke public and anon from storage.objects'
  );

  // Verify staff management policy
  assert.match(
    sql,
    /CREATE\s+POLICY\s+storage_objects_staff_manage\s+ON\s+storage\.objects/i,
    'Must define staff management policy on storage.objects'
  );

  // Verify customer self-service policies
  assert.match(
    sql,
    /CREATE\s+POLICY\s+storage_objects_customer_own_insert\s+ON\s+storage\.objects/i,
    'Must define customer own insert policy on storage.objects'
  );
  assert.match(
    sql,
    /CREATE\s+POLICY\s+storage_objects_customer_own_select\s+ON\s+storage\.objects/i,
    'Must define customer own select policy on storage.objects'
  );
  assert.match(
    sql,
    /CREATE\s+POLICY\s+storage_objects_customer_own_delete\s+ON\s+storage\.objects/i,
    'Must define customer own delete policy on storage.objects'
  );

  // Verify account active check in customer policies
  assert.ok(
    sql.includes('public.auth_is_account_active(auth.uid())'),
    'Customer storage policies must enforce active account standing'
  );
});

test('Migration 00007 enhances share_grants schema with match_case_id and snapshot (P0-08, P1-27)', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  assert.match(
    sql,
    /ALTER\s+TABLE\s+public\.share_grants\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+match_case_id/i,
    'Must add match_case_id column to share_grants'
  );
  assert.match(
    sql,
    /ALTER\s+TABLE\s+public\.share_grants\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+disclosed_snapshot/i,
    'Must add disclosed_snapshot column to share_grants'
  );
  assert.match(
    sql,
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_share_grants_match_case/i,
    'Must create index on share_grants match_case_id'
  );
  assert.match(
    sql,
    /CREATE\s+POLICY\s+share_grants_customer_own_select\s+ON\s+public\.share_grants/i,
    'Must define customer select policy on share_grants'
  );
});

test('Migration 00007 defines server-side RPC functions for share grants and privacy erasure (P0-07, P0-08, P1-28)', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  // create_share_grant
  assert.match(
    sql,
    /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.create_share_grant/i,
    'Must define create_share_grant RPC'
  );
  assert.ok(sql.includes('p_token_hash VARCHAR(64)'), 'create_share_grant must take 64-char token hash');
  assert.ok(sql.includes('p_disclosed_snapshot JSONB'), 'create_share_grant must take disclosed snapshot');

  // redeem_share_grant
  assert.match(
    sql,
    /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.redeem_share_grant/i,
    'Must define redeem_share_grant RPC'
  );

  // revoke_share_grant
  assert.match(
    sql,
    /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.revoke_share_grant/i,
    'Must define revoke_share_grant RPC'
  );

  // execute_candidate_privacy_erasure
  assert.match(
    sql,
    /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.execute_candidate_privacy_erasure/i,
    'Must define execute_candidate_privacy_erasure RPC'
  );

  // Verify SECURITY DEFINER on RPCs
  const securityDefinerCount = (sql.match(/SECURITY DEFINER/g) || []).length;
  assert.ok(securityDefinerCount >= 4, 'All four server RPCs must use SECURITY DEFINER');
});

test('Migration 00007 does not contain mock or production candidate data seeding', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  assert.ok(!sql.includes("'Fatima Zahra'"), 'Must not seed mock profile Fatima Zahra');
  assert.ok(!sql.includes("'Tariq Mehmood'"), 'Must not seed mock contact Tariq Mehmood');
  assert.ok(!sql.includes("'demo-staff-token'"), 'Must not seed mock bearer tokens');
  assert.ok(!sql.includes('+92 300 1234567'), 'Must not seed mock phone numbers');
});
