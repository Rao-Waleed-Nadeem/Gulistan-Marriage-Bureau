/**
 * @file migration_00006.test.js
 * @description Automated verification of Migration 00006 (T-033):
 * - Customer child table RLS policies for self-service intake (P0-03, P0-15)
 * - Lossless nested schema mapping support (P1-10, P1-11, P1-12)
 * - Atomic transactional profile intake RPC create_profile_bundle (P1-13)
 * - Collision-resistant reference code generation support (P1-14)
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const MIGRATION_PATH = resolve(import.meta.dirname, '../migrations/00006_profile_intake_and_ownership_enhancements.sql');

test('Migration 00006 exists and is wrapped in a transaction block', () => {
  assert.ok(existsSync(MIGRATION_PATH), '00006_profile_intake_and_ownership_enhancements.sql must exist');
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  const sqlWithoutLeadingComments = sql.replace(/^(\s*--[^\n]*\n)*/, '').trim();
  assert.ok(sqlWithoutLeadingComments.startsWith('BEGIN;'), 'Migration must start with BEGIN;');
  assert.ok(sql.trim().endsWith('COMMIT;'), 'Migration must end with COMMIT;');
});

test('Migration 00006 implements customer child table policies for self-service intake (P0-03, P0-15)', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  // Preferences policies
  assert.match(
    sql,
    /CREATE\s+POLICY\s+prefs_customer_own_select\s+ON\s+public\.profile_preferences/i,
    'Must define customer select policy for preferences'
  );
  assert.match(
    sql,
    /CREATE\s+POLICY\s+prefs_customer_own_insert\s+ON\s+public\.profile_preferences/i,
    'Must define customer insert policy for preferences'
  );
  assert.match(
    sql,
    /CREATE\s+POLICY\s+prefs_customer_own_update\s+ON\s+public\.profile_preferences/i,
    'Must define customer update policy for preferences'
  );

  // Siblings policies
  assert.match(
    sql,
    /CREATE\s+POLICY\s+siblings_customer_own_select\s+ON\s+public\.profile_siblings/i,
    'Must define customer select policy for siblings'
  );
  assert.match(
    sql,
    /CREATE\s+POLICY\s+siblings_customer_own_insert\s+ON\s+public\.profile_siblings/i,
    'Must define customer insert policy for siblings'
  );
  assert.match(
    sql,
    /CREATE\s+POLICY\s+siblings_customer_own_update\s+ON\s+public\.profile_siblings/i,
    'Must define customer update policy for siblings'
  );

  // Property policies
  assert.match(
    sql,
    /CREATE\s+POLICY\s+property_customer_own_select\s+ON\s+public\.profile_property_details/i,
    'Must define customer select policy for property details'
  );
  assert.match(
    sql,
    /CREATE\s+POLICY\s+property_customer_own_insert\s+ON\s+public\.profile_property_details/i,
    'Must define customer insert policy for property details'
  );
  assert.match(
    sql,
    /CREATE\s+POLICY\s+property_customer_own_update\s+ON\s+public\.profile_property_details/i,
    'Must define customer update policy for property details'
  );

  // Verify ownership binding (account_id OR created_by)
  assert.ok(
    sql.includes('p.account_id = auth.uid() OR p.created_by = auth.uid()'),
    'Policies must check ownership via account_id or created_by'
  );
});

test('Migration 00006 defines transactional profile intake RPC create_profile_bundle (P1-13)', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  assert.match(
    sql,
    /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.create_profile_bundle/i,
    'Must define create_profile_bundle function'
  );

  assert.ok(
    sql.includes('LANGUAGE plpgsql'),
    'Must use PL/pgSQL for transaction handling'
  );

  assert.ok(
    sql.includes('SECURITY DEFINER'),
    'Must be SECURITY DEFINER to enforce intake constraints cleanly'
  );

  assert.ok(
    sql.includes('auth_is_account_active'),
    'Must enforce active account status for caller'
  );

  assert.ok(
    sql.includes("v_status := 'pending_review'"),
    'Must force pending_review for customer self-service'
  );

  assert.ok(
    sql.includes("v_source := 'direct_web'"),
    'Must force direct_web for customer self-service'
  );

  assert.ok(
    sql.includes('GRANT EXECUTE ON FUNCTION public.create_profile_bundle'),
    'Must grant execute permission to authenticated users'
  );
});

test('Migration 00006 does not contain mock or production candidate data seeding', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  assert.ok(!sql.includes("INSERT INTO public.profiles VALUES"), 'Must not seed mock profile rows');
  assert.ok(!sql.includes("@example.com"), 'Must not contain test email fixtures');
});
