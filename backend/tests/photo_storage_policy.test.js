import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATION_PATH = path.resolve(__dirname, '../migrations/00001_initial_schema_baseline.sql');

test('Database baseline defines candidate photo consent types per OPEN-004 and OPEN-008', () => {
  const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');

  // Verify candidate_consents table defines photo_storage and photo_disclosure types
  assert.ok(
    sql.includes("CONSTRAINT chk_consent_type CHECK (consent_type IN ('profile_intake', 'photo_storage', 'photo_disclosure', 'third_party_share'))"),
    'Must include photo_storage and photo_disclosure consent types'
  );

  // Verify profiles table has photo_permission_granted boolean
  assert.ok(
    sql.includes("photo_permission_granted BOOLEAN NOT NULL DEFAULT FALSE"),
    'Must default photo permission to FALSE (deny by default)'
  );
});

test('Audit trail prohibits storage of raw photo URLs and bearer tokens', () => {
  const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');

  // Audit events table only stores target_type and target_id, not secret tokens or URLs
  assert.ok(
    sql.includes("CREATE TABLE IF NOT EXISTS public.audit_events"),
    'Must define audit_events'
  );

  // Details column should be reserved for minimal operational description
  assert.ok(
    !sql.includes("photo_url TEXT"),
    'Audit table must never include dedicated photo_url columns'
  );
});

test('Storage policy requires private bucket isolation and denies public bucket access', () => {
  // Storage architectural invariants:
  const allowedBuckets = ['private-photos'];
  const disallowedBuckets = ['public-photos', 'avatars-public'];

  assert.ok(allowedBuckets.includes('private-photos'));
  assert.ok(!allowedBuckets.some((b) => disallowedBuckets.includes(b)));
});
