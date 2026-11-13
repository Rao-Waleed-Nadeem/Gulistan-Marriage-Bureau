import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATION_PATH = path.resolve(__dirname, '../migrations/00003_complete_normalized_schema.sql');

test('Migration 00003 exists and is wrapped in a transaction block', () => {
  assert.ok(fs.existsSync(MIGRATION_PATH), 'Migration 00003 must exist');
  const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');

  // Strip leading comments and check for BEGIN;
  const sqlWithoutLeadingComments = sql.replace(/^(\s*--[^\n]*\n)*/, '').trim();
  assert.ok(sqlWithoutLeadingComments.startsWith('BEGIN;'), 'Migration must start with BEGIN;');
  assert.ok(sql.trim().endsWith('COMMIT;'), 'Migration must end with COMMIT;');
});

test('Migration 00003 defines all 14 required normalized domain tables', () => {
  const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');
  const expectedTables = [
    'public.user_profiles',
    'public.app_settings',
    'public.profile_preferences',
    'public.profile_siblings',
    'public.profile_property_details',
    'public.profile_photos',
    'public.profile_status_history',
    'public.external_matchmakers',
    'public.matchmaker_agreements',
    'public.match_cases',
    'public.match_evaluations',
    'public.match_decisions',
    'public.share_grants',
    'public.crm_follow_ups',
  ];

  for (const table of expectedTables) {
    const tableRegex = new RegExp(`CREATE TABLE IF NOT EXISTS ${table.replace('.', '\\.')}`, 'i');
    assert.ok(tableRegex.test(sql), `Table ${table} must be defined in Migration 00003`);
  }
});

test('Migration 00003 enables Row-Level Security on all 14 tables', () => {
  const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');
  const expectedTables = [
    'public.user_profiles',
    'public.app_settings',
    'public.profile_preferences',
    'public.profile_siblings',
    'public.profile_property_details',
    'public.profile_photos',
    'public.profile_status_history',
    'public.external_matchmakers',
    'public.matchmaker_agreements',
    'public.match_cases',
    'public.match_evaluations',
    'public.match_decisions',
    'public.share_grants',
    'public.crm_follow_ups',
  ];

  for (const table of expectedTables) {
    const rlsRegex = new RegExp(`ALTER TABLE ${table.replace('.', '\\.')} ENABLE ROW LEVEL SECURITY;`, 'i');
    assert.ok(rlsRegex.test(sql), `RLS must be enabled on ${table}`);
  }
});

test('Migration 00003 revokes public and anon access explicitly from all 14 tables', () => {
  const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');
  const expectedRevokes = [
    'public.user_profiles',
    'public.app_settings',
    'public.profile_preferences',
    'public.profile_siblings',
    'public.profile_property_details',
    'public.profile_photos',
    'public.profile_status_history',
    'public.external_matchmakers',
    'public.matchmaker_agreements',
    'public.match_cases',
    'public.match_evaluations',
    'public.match_decisions',
    'public.share_grants',
    'public.crm_follow_ups',
  ];

  for (const table of expectedRevokes) {
    const revokeRegex = new RegExp(`REVOKE ALL ON TABLE ${table.replace('.', '\\.')} FROM public, anon;`, 'i');
    assert.ok(revokeRegex.test(sql), `Must revoke public/anon access from ${table}`);
  }
});

test('Migration 00003 defines security constraints and foreign keys', () => {
  const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');

  // Token hash length check (64 chars for SHA-256)
  assert.ok(sql.includes('CONSTRAINT chk_share_token_len CHECK (length(token_hash) = 64)'));

  // Non-self matching check
  assert.ok(sql.includes('CONSTRAINT chk_match_not_self CHECK (profile_a_id <> profile_b_id)'));

  // Match case pair uniqueness
  assert.ok(sql.includes('CONSTRAINT uq_match_case_pair UNIQUE (profile_a_id, profile_b_id)'));

  // Sibling invariants
  assert.ok(sql.includes("CONSTRAINT chk_sibling_relation CHECK (relation IN ('brother', 'sister'))"));
  assert.ok(sql.includes('CONSTRAINT chk_sibling_children CHECK (children_count >= 0)'));

  // Property area non-negative
  assert.ok(sql.includes('CONSTRAINT chk_property_area CHECK (area_marlas >= 0)'));

  // Photo size & mime checks
  assert.ok(sql.includes('CONSTRAINT chk_photo_size CHECK (file_size_bytes > 0 AND file_size_bytes <= 5242880)'));
  assert.ok(sql.includes("CONSTRAINT chk_photo_mime CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp'))"));
});

test('Migration 00003 does not contain mock or production candidate data seeding', () => {
  const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');

  // Verify no INSERT statements seed candidate records
  assert.ok(!sql.includes("INSERT INTO public.profiles"), "Must not seed profiles");
  assert.ok(!sql.includes("INSERT INTO public.profile_siblings"), "Must not seed siblings");
  assert.ok(!sql.includes("INSERT INTO public.profile_photos"), "Must not seed photos");
  assert.ok(!sql.includes("INSERT INTO public.crm_follow_ups"), "Must not seed follow ups");
});
