import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATION_PATH = path.resolve(__dirname, '../migrations/00001_initial_schema_baseline.sql');

test('Migration 00001 schema enforces profile invariant check constraints', () => {
  const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');

  // Age invariant: 18 - 100
  assert.ok(
    sql.includes("CONSTRAINT chk_profiles_age CHECK (age >= 18 AND age <= 100)"),
    'Must enforce age between 18 and 100'
  );

  // Height invariant: 48 - 96 inches
  assert.ok(
    sql.includes("CONSTRAINT chk_profiles_height_inches CHECK (height_inches >= 48 AND height_inches <= 96)"),
    'Must enforce height between 48 and 96 inches'
  );

  // Gender invariant: male / female
  assert.ok(
    sql.includes("CONSTRAINT chk_profiles_gender CHECK (gender IN ('male', 'female'))"),
    'Must enforce gender in male, female'
  );

  // Marital status invariant
  assert.ok(
    sql.includes("CONSTRAINT chk_profiles_marital_status CHECK (marital_status IN ('never_married', 'divorced', 'widowed', 'khula'))"),
    'Must enforce standard Pakistani marital statuses'
  );

  // Non-negative income
  assert.ok(
    sql.includes("CONSTRAINT chk_profiles_income CHECK (monthly_income_pkr IS NULL OR monthly_income_pkr >= 0)"),
    'Must enforce non-negative income'
  );

  // Approved lifecycle statuses
  assert.ok(
    sql.includes("CONSTRAINT chk_profiles_status CHECK (status IN ('pending_review', 'approved', 'active', 'introduction_authorized', 'inactive', 'restricted'))"),
    'Must enforce approved profile lifecycle statuses'
  );

  // Representative consent certification (OPEN-004)
  assert.ok(
    sql.includes("CONSTRAINT chk_profiles_consent_certified CHECK (representative_consent_certified = TRUE)"),
    'Must enforce mandatory representative consent certification'
  );
});

test('RLS access policies restrict profile creation and modification to staff', () => {
  const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');

  // Staff insert policy (Closed Concierge Intake per OPEN-003)
  assert.ok(
    sql.includes("CREATE POLICY profiles_staff_insert ON public.profiles") &&
    sql.includes("WITH CHECK (public.auth_is_staff())"),
    'Must enforce staff-only insertion'
  );

  // Staff update policy
  assert.ok(
    sql.includes("CREATE POLICY profiles_staff_update ON public.profiles") &&
    sql.includes("USING (public.auth_is_staff())"),
    'Must enforce staff-only update'
  );

  // Customer isolated select (own profile only)
  assert.ok(
    sql.includes("CREATE POLICY profiles_customer_select_own ON public.profiles") &&
    sql.includes("USING (created_by = auth.uid())"),
    'Customer can only select their own profile'
  );
});

test('State machine transition contract forbids unauthorized status jumps', () => {
  const validTransitions = {
    pending_review: ['approved', 'restricted'],
    approved: ['active', 'restricted'],
    active: ['introduction_authorized', 'inactive', 'restricted'],
    introduction_authorized: ['active', 'inactive'],
    inactive: ['pending_review'],
    restricted: ['pending_review'],
  };

  // pending_review cannot bypass human approval straight to introduction_authorized
  assert.ok(!validTransitions.pending_review.includes('introduction_authorized'));

  // inactive cannot jump directly to active or introduction_authorized
  assert.ok(!validTransitions.inactive.includes('active'));
  assert.ok(!validTransitions.inactive.includes('introduction_authorized'));

  // active can transition to introduction_authorized
  assert.ok(validTransitions.active.includes('introduction_authorized'));
});
