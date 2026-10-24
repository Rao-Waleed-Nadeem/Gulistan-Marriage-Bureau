import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATION_PATH = path.resolve(__dirname, '../migrations/00001_initial_schema_baseline.sql');

test('Migration 00001 exists and is wrapped in a transaction block', () => {
  assert.ok(fs.existsSync(MIGRATION_PATH), 'Migration 00001 must exist');
  const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');

  // Strip leading comments and check for BEGIN
  const sqlWithoutLeadingComments = sql.replace(/^(\s*--[^\n]*\n)*/, '').trim();
  assert.ok(sqlWithoutLeadingComments.startsWith('BEGIN;'), 'Migration must start with BEGIN;');
  assert.ok(sql.trim().endsWith('COMMIT;'), 'Migration must end with COMMIT;');
});

test('Migration 00001 defines all required core tables', () => {
  const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');
  const expectedTables = [
    'public.user_roles',
    'public.profiles',
    'public.candidate_consents',
    'public.audit_events',
  ];

  for (const table of expectedTables) {
    const tableRegex = new RegExp(`CREATE TABLE IF NOT EXISTS ${table.replace('.', '\\.')}`, 'i');
    assert.ok(tableRegex.test(sql), `Table ${table} must be defined`);
  }
});

test('Migration 00001 enables Row-Level Security on every table', () => {
  const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');
  const expectedTables = [
    'public.user_roles',
    'public.profiles',
    'public.candidate_consents',
    'public.audit_events',
  ];

  for (const table of expectedTables) {
    const rlsRegex = new RegExp(`ALTER TABLE ${table.replace('.', '\\.')} ENABLE ROW LEVEL SECURITY;`, 'i');
    assert.ok(rlsRegex.test(sql), `RLS must be enabled on ${table}`);
  }
});

test('Migration 00001 revokes public and anon access explicitly', () => {
  const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');
  const expectedRevokes = [
    'public.user_roles',
    'public.profiles',
    'public.candidate_consents',
    'public.audit_events',
  ];

  for (const table of expectedRevokes) {
    const revokeRegex = new RegExp(`REVOKE ALL ON TABLE ${table.replace('.', '\\.')} FROM public, anon;`, 'i');
    assert.ok(revokeRegex.test(sql), `Privileges must be revoked from public, anon on ${table}`);
  }
});

test('Migration 00001 enforces positive and negative access control policies', () => {
  const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');

  // Staff can read all profiles
  assert.ok(
    /CREATE POLICY profiles_staff_select ON public\.profiles/i.test(sql),
    'Must define profiles_staff_select policy'
  );

  // Customer can only read own profile (isolation test)
  assert.ok(
    /CREATE POLICY profiles_customer_select_own ON public\.profiles/i.test(sql),
    'Must define profiles_customer_select_own policy'
  );
  assert.ok(
    /created_by = auth\.uid\(\)/i.test(sql),
    'Customer policy must bind to auth.uid()'
  );

  // Closed concierge intake: staff only inserts
  assert.ok(
    /CREATE POLICY profiles_staff_insert ON public\.profiles/i.test(sql),
    'Must enforce staff-only insert for closed intake'
  );

  // Audit log is append-only: NO UPDATE or DELETE policies allowed
  assert.ok(
    /CREATE POLICY audit_events_insert ON public\.audit_events/i.test(sql),
    'Audit events must have insert policy'
  );
  assert.ok(
    !/CREATE POLICY [a-z0-9_]+ ON public\.audit_events\s+FOR UPDATE/i.test(sql),
    'Audit events must NEVER have UPDATE policy'
  );
  assert.ok(
    !/CREATE POLICY [a-z0-9_]+ ON public\.audit_events\s+FOR DELETE/i.test(sql),
    'Audit events must NEVER have DELETE policy'
  );
});

test('Migration 00001 enforces domain integrity check constraints', () => {
  const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');

  // Age bound constraint
  assert.ok(
    /chk_profiles_age CHECK \(age >= 18 AND age <= 100\)/i.test(sql),
    'Profiles must enforce legal age range (18-100)'
  );

  // Height constraint (inches)
  assert.ok(
    /chk_profiles_height_inches CHECK \(height_inches >= 48 AND height_inches <= 96\)/i.test(sql),
    'Profiles must enforce height range check'
  );

  // Monthly income constraint (non-negative)
  assert.ok(
    /chk_profiles_income CHECK \(monthly_income_pkr IS NULL OR monthly_income_pkr >= 0\)/i.test(sql),
    'Profiles must enforce non-negative income'
  );

  // Legal consent certification constraint
  assert.ok(
    /chk_profiles_consent_certified CHECK \(representative_consent_certified = TRUE\)/i.test(sql),
    'Representative consent certification must be TRUE'
  );

  // Reference code uniqueness
  assert.ok(
    /uq_profiles_reference_code UNIQUE \(reference_code\)/i.test(sql),
    'Profiles must enforce unique reference_code'
  );
});

test('Migration 00001 does not contain any mock or production data seeding', () => {
  const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');

  assert.ok(!/INSERT INTO public\.profiles/i.test(sql), 'Must not seed profile rows in schema migration');
  assert.ok(!/Dr\. Fatima/i.test(sql), 'Must not contain mock candidate names');
  assert.ok(!/INSERT INTO public\.audit_events/i.test(sql), 'Must not seed audit rows');
});
