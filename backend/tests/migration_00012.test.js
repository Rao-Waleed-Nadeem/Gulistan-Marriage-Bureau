/**
 * @file migration_00012.test.js
 * @description Automated verification of Migration 00012 (T-039):
 * - Composite search indexes for 100k scale query plans (OPS-05)
 * - Keyset cursor pagination index (OPS-05, P1-19)
 * - Atomic server RPC search_profiles_paginated with bounded page limits (P1-19)
 * - Least-privilege permissions and grants
 * - Zero mock or synthetic candidate data seeding
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const MIGRATION_PATH = resolve(import.meta.dirname, '../migrations/00012_search_indexes_and_server_pagination.sql');

test('Migration 00012 exists and is wrapped in a transaction block', () => {
  assert.ok(existsSync(MIGRATION_PATH), '00012_search_indexes_and_server_pagination.sql must exist');
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  const sqlWithoutLeadingComments = sql.replace(/^(\s*--[^\n]*\n)*/, '').trim();
  assert.ok(sqlWithoutLeadingComments.startsWith('BEGIN;'), 'Migration must start with BEGIN;');
  assert.ok(sql.trim().endsWith('COMMIT;'), 'Migration must end with COMMIT;');
});

test('Migration 00012 provisions composite demographic and location search indexes (OPS-05)', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  // Multi-attribute composite index: (gender, status, religion, aqeedah, marital_status, age)
  assert.match(
    sql,
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_profiles_search_composite\s+ON\s+public\.profiles\s*\(\s*gender,\s*status,\s*religion,\s*aqeedah,\s*marital_status,\s*age\s*\)/i,
    'Must create composite search index idx_profiles_search_composite'
  );

  // Localization index: (current_city, caste)
  assert.match(
    sql,
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_profiles_city_caste\s+ON\s+public\.profiles\s*\(\s*current_city,\s*caste\s*\)/i,
    'Must create composite index idx_profiles_city_caste'
  );

  // Status and reverse chronological index: (status, created_at DESC, id)
  assert.match(
    sql,
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_profiles_status_created\s+ON\s+public\.profiles\s*\(\s*status,\s*created_at\s+DESC,\s*id\s*\)/i,
    'Must create composite index idx_profiles_status_created'
  );

  // Location, gender, age index: (current_city, gender, age)
  assert.match(
    sql,
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_profiles_location_gender_age\s+ON\s+public\.profiles\s*\(\s*current_city,\s*gender,\s*age\s*\)/i,
    'Must create composite index idx_profiles_location_gender_age'
  );
});

test('Migration 00012 provisions keyset / cursor pagination index (OPS-05, P1-19)', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  assert.match(
    sql,
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_profiles_keyset_pagination\s+ON\s+public\.profiles\s*\(\s*created_at\s+DESC,\s*id\s*\)/i,
    'Must create keyset cursor index idx_profiles_keyset_pagination on (created_at DESC, id)'
  );
});

test('Migration 00012 defines atomic search_profiles_paginated RPC with bounded pagination (P1-19)', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  assert.match(
    sql,
    /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.search_profiles_paginated\s*\(/i,
    'Must define public.search_profiles_paginated function'
  );

  // Verifies parameters
  assert.ok(sql.includes('p_status VARCHAR DEFAULT NULL'), 'Must accept p_status parameter');
  assert.ok(sql.includes('p_gender VARCHAR DEFAULT NULL'), 'Must accept p_gender parameter');
  assert.ok(sql.includes('p_city TEXT DEFAULT NULL'), 'Must accept p_city parameter');
  assert.ok(sql.includes('p_caste TEXT DEFAULT NULL'), 'Must accept p_caste parameter');
  assert.ok(sql.includes('p_min_age INT DEFAULT NULL'), 'Must accept p_min_age parameter');
  assert.ok(sql.includes('p_max_age INT DEFAULT NULL'), 'Must accept p_max_age parameter');
  assert.ok(sql.includes('p_marital_status VARCHAR DEFAULT NULL'), 'Must accept p_marital_status parameter');
  assert.ok(sql.includes('p_limit INT DEFAULT 20'), 'Must accept p_limit parameter with default 20');
  assert.ok(sql.includes('p_offset INT DEFAULT 0'), 'Must accept p_offset parameter with default 0');
  assert.ok(sql.includes('p_cursor_created_at TIMESTAMPTZ DEFAULT NULL'), 'Must accept p_cursor_created_at parameter');
  assert.ok(sql.includes('p_cursor_id UUID DEFAULT NULL'), 'Must accept p_cursor_id parameter');

  // Verifies bound clamp on page limit
  assert.match(
    sql,
    /v_effective_limit\s*:=\s*LEAST\s*\(\s*GREATEST\s*\(\s*COALESCE\s*\(\s*p_limit,\s*20\s*\),\s*1\s*\),\s*100\s*\);/i,
    'Must clamp effective limit to [1, 100] to prevent unbounded whole-registry payloads'
  );

  // Verifies security attributes
  assert.ok(sql.includes('SECURITY DEFINER'), 'Must be SECURITY DEFINER');
  assert.ok(sql.includes('SET search_path = public, pg_temp'), 'Must set secure search_path');

  // Verifies keyset pagination condition
  assert.ok(
    sql.includes('p.created_at < p_cursor_created_at OR (p.created_at = p_cursor_created_at AND p.id < p_cursor_id)'),
    'Must support keyset cursor pagination for high-scale deterministic traversal'
  );

  // Verifies output structure
  assert.ok(sql.includes("'items', v_items"), 'Must return items array');
  assert.ok(sql.includes("'total_count', v_total_count"), 'Must return total_count');
  assert.ok(sql.includes("'has_more', v_has_more"), 'Must return has_more indicator');
  assert.ok(sql.includes("'next_cursor', v_next_cursor"), 'Must return next_cursor object');
});

test('Migration 00012 enforces role-based privacy projection in search results', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  // Verify staff vs public pseudonym projection
  assert.ok(
    sql.includes("WHEN v_is_staff THEN p.full_name") &&
    sql.includes("ELSE 'Candidate ' || SUBSTRING(p.reference_code FROM 5)"),
    'Must sanitize full names to Candidate reference pseudonyms for non-staff viewers'
  );

  // Verify income concealment for non-staff
  assert.ok(
    sql.includes("WHEN v_is_staff THEN p.monthly_income_pkr") &&
    sql.includes("ELSE NULL"),
    'Must conceal monthly income from non-staff viewers'
  );

  // Verify status restriction for non-staff
  assert.ok(
    sql.includes("(v_is_staff OR p.status IN ('active', 'introduction_authorized'))"),
    'Non-staff viewers must be restricted to active or introduction_authorized candidates'
  );
});

test('Migration 00012 sets least-privilege permissions on search_profiles_paginated', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  assert.match(
    sql,
    /REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.search_profiles_paginated[\s\S]+?FROM\s+public,\s*anon;/i,
    'Must revoke execution from public and anon'
  );
  assert.match(
    sql,
    /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.search_profiles_paginated[\s\S]+?TO\s+authenticated,\s*service_role;/i,
    'Must grant execution to authenticated and service_role'
  );
});

test('Migration 00012 contains zero mock or synthetic candidate profile data seeding', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  assert.doesNotMatch(
    sql,
    /INSERT\s+INTO\s+public\.profiles/i,
    'Must not seed candidate profiles into public.profiles'
  );
  assert.doesNotMatch(
    sql,
    /INSERT\s+INTO\s+public\.user_profiles/i,
    'Must not seed test users'
  );
});
