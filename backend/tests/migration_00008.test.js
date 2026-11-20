/**
 * @file migration_00008.test.js
 * @description Automated verification of Migration 00008 (T-035):
 * - Canonical pair unique index on match_cases (P1-23)
 * - Server-side RPC get_or_create_match_case with canonical pair ordering (P1-23)
 * - Restrictive RLS policy on match_decisions for matchmaker (Nadeem) and admin (P1-22)
 * - Atomic server RPC record_match_decision with evaluation prerequisite and audited admin override (P1-20, P1-21, P1-22)
 * - Zero mock or synthetic candidate data seeding
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const MIGRATION_PATH = resolve(import.meta.dirname, '../migrations/00008_match_cases_and_decisions_enhancements.sql');

test('Migration 00008 exists and is wrapped in a transaction block', () => {
  assert.ok(existsSync(MIGRATION_PATH), '00008_match_cases_and_decisions_enhancements.sql must exist');
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  const sqlWithoutLeadingComments = sql.replace(/^(\s*--[^\n]*\n)*/, '').trim();
  assert.ok(sqlWithoutLeadingComments.startsWith('BEGIN;'), 'Migration must start with BEGIN;');
  assert.ok(sql.trim().endsWith('COMMIT;'), 'Migration must end with COMMIT;');
});

test('Migration 00008 creates canonical profile pair unique index on match_cases (P1-23)', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  assert.match(
    sql,
    /CREATE\s+UNIQUE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+uq_match_cases_canonical_pair\s+ON\s+public\.match_cases\s*\(\s*LEAST\s*\(\s*profile_a_id\s*,\s*profile_b_id\s*\)\s*,\s*GREATEST\s*\(\s*profile_a_id\s*,\s*profile_b_id\s*\)\s*\)/i,
    'Must create canonical pair unique index using LEAST and GREATEST on profile IDs'
  );
});

test('Migration 00008 defines get_or_create_match_case RPC with canonical ordering (P1-23, P0-06)', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  assert.match(
    sql,
    /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.get_or_create_match_case/i,
    'Must define get_or_create_match_case RPC'
  );

  assert.ok(
    sql.includes('p_profile_a_id UUID') && sql.includes('p_profile_b_id UUID'),
    'get_or_create_match_case must accept UUID profile parameters'
  );

  assert.ok(
    sql.includes("LEAST(p_profile_a_id, p_profile_b_id)") && sql.includes("GREATEST(p_profile_a_id, p_profile_b_id)"),
    'get_or_create_match_case must canonicalize pair order with LEAST and GREATEST'
  );

  assert.ok(
    sql.includes('SELF_PAIR_PROHIBITED'),
    'Must reject self-pairing in RPC'
  );

  assert.ok(
    sql.includes('public.auth_is_staff()'),
    'Must enforce staff authorization in get_or_create_match_case'
  );
});

test('Migration 00008 defines record_match_decision RPC with atomic update and evaluation prerequisites (P1-20, P1-21, P1-22)', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  assert.match(
    sql,
    /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.record_match_decision/i,
    'Must define record_match_decision RPC'
  );

  // Authorization check for Nadeem (matchmaker)
  assert.ok(
    sql.includes("public.auth_has_role('matchmaker'::public.app_role)"),
    'Must check matchmaker role'
  );

  // Audited admin override
  assert.ok(
    sql.includes('match_approval_admin_override'),
    'Must log match_approval_admin_override audit event on admin override'
  );
  assert.ok(
    sql.includes('ADMIN_OVERRIDE_REQUIRED'),
    'Must require explicit admin_override flag when admin approves'
  );

  // Evaluation prerequisite check (P1-20)
  assert.ok(
    sql.includes('NO_EVALUATION_FOUND'),
    'Must block approval when no evaluation is found'
  );
  assert.ok(
    sql.includes('CANNOT_APPROVE_INELIGIBLE_MATCH'),
    'Must block approval when mandatory criteria are not satisfied'
  );

  // Atomic update of match_cases.status and insert into match_decisions (P1-21)
  assert.match(
    sql,
    /INSERT\s+INTO\s+public\.match_decisions/i,
    'Must insert into match_decisions'
  );
  assert.match(
    sql,
    /UPDATE\s+public\.match_cases\s+SET\s+status\s*=\s*v_new_status/i,
    'Must atomically update match_cases.status in the same transaction'
  );
});

test('Migration 00008 tightens RLS on match_decisions to matchmaker and admin (P1-22)', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  assert.match(
    sql,
    /DROP\s+POLICY\s+IF\s+EXISTS\s+decisions_staff_manage\s+ON\s+public\.match_decisions/i,
    'Must drop broad staff policy on match_decisions'
  );

  assert.match(
    sql,
    /CREATE\s+POLICY\s+decisions_matchmaker_manage\s+ON\s+public\.match_decisions/i,
    'Must create decisions_matchmaker_manage policy'
  );

  assert.ok(
    sql.includes("auth_has_role('matchmaker'::public.app_role)"),
    'Policy must require matchmaker role'
  );
});

test('Migration 00008 does not contain mock or production candidate data seeding', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  assert.ok(!sql.includes("'Fatima Zahra'"), 'Must not seed mock profile Fatima Zahra');
  assert.ok(!sql.includes("'Tariq Mehmood'"), 'Must not seed mock contact Tariq Mehmood');
  assert.ok(!sql.includes("'demo-staff-token'"), 'Must not seed mock bearer tokens');
  assert.ok(!sql.includes('+92 300 1234567'), 'Must not seed mock phone numbers');
});
