/**
 * @file migration_00011.test.js
 * @description Automated verification of Migration 00011 (T-038):
 * - Durable migration batches and reconciliation schema (P1-39)
 * - Zero demographic fabrication and mandatory invariant checks (P1-40)
 * - True merge update support for conflict resolution (P1-41)
 * - Atomic import_migration_batch server RPC with row-level locking (P1-42)
 * - Staged record rollback state support and rollback_migration_batch RPC (P1-46)
 * - Raw conversation minimization and purge_staged_raw_content RPC (P1-47)
 * - Zero mock or synthetic candidate data seeding
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const MIGRATION_PATH = resolve(import.meta.dirname, '../migrations/00011_durable_migration_batches_and_reconciliation.sql');

test('Migration 00011 exists and is wrapped in a transaction block', () => {
  assert.ok(existsSync(MIGRATION_PATH), '00011_durable_migration_batches_and_reconciliation.sql must exist');
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  const sqlWithoutLeadingComments = sql.replace(/^(\s*--[^\n]*\n)*/, '').trim();
  assert.ok(sqlWithoutLeadingComments.startsWith('BEGIN;'), 'Migration must start with BEGIN;');
  assert.ok(sql.trim().endsWith('COMMIT;'), 'Migration must end with COMMIT;');
});

test('Migration 00011 alters migration_batches with reconciliation and rollback tracking (P1-39, P1-46)', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  assert.match(
    sql,
    /ALTER\s+TABLE\s+public\.migration_batches/i,
    'Must alter migration_batches'
  );
  assert.ok(sql.includes('reconciled_at TIMESTAMPTZ NULL'), 'Must add reconciled_at column');
  assert.ok(sql.includes('rolled_back_at TIMESTAMPTZ NULL'), 'Must add rolled_back_at column');
  assert.ok(sql.includes('rollback_reason TEXT NULL'), 'Must add rollback_reason column');
});

test('Migration 00011 alters migration_staged_records for raw content minimization and rollback status (P1-46, P1-47)', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  assert.match(
    sql,
    /ALTER\s+COLUMN\s+raw_content\s+DROP\s+NOT\s+NULL/i,
    'Must make raw_content nullable for data minimization (P1-47)'
  );
  assert.ok(
    sql.includes('is_raw_purged BOOLEAN NOT NULL DEFAULT FALSE'),
    'Must add is_raw_purged column (P1-47)'
  );
  assert.ok(
    sql.includes('raw_content_hash VARCHAR(64) NULL'),
    'Must add raw_content_hash column (P1-47)'
  );
  assert.match(
    sql,
    /'rolled_back'/,
    'Must support rolled_back status in migration_staged_records (P1-46)'
  );
});

test('Migration 00011 defines atomic import_migration_batch RPC with owner approval and true merge (P1-40, P1-41, P1-42)', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  assert.match(
    sql,
    /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.import_migration_batch/i,
    'Must define import_migration_batch function'
  );

  assert.ok(
    sql.includes('public.auth_is_staff()'),
    'Must enforce staff authorization check'
  );

  assert.ok(
    sql.includes('FOR UPDATE'),
    'Must lock batch row with FOR UPDATE'
  );

  assert.ok(
    sql.includes("status <> 'approved_by_owner'") || sql.includes("owner_approved_by IS NULL"),
    'Must enforce affirmative owner approval gate before import'
  );

  assert.ok(
    sql.includes('merge_update') && sql.includes('conflict_profile_id'),
    'Must handle merge_update action for conflicts (P1-41)'
  );

  assert.ok(
    sql.includes('DATA_VALIDATION_ERROR'),
    'Must quarantine invalid rows rather than fabricating data (P1-40)'
  );
});

test('Migration 00011 defines durable rollback_migration_batch RPC (P1-46)', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  assert.match(
    sql,
    /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.rollback_migration_batch/i,
    'Must define rollback_migration_batch function'
  );

  assert.ok(
    sql.includes("status = 'restricted'"),
    'Must deactivate imported profiles to restricted status'
  );

  assert.ok(
    sql.includes("status = 'rolled_back'"),
    'Must set batch and staged records status to rolled_back'
  );

  assert.ok(
    sql.includes('MIGRATION_BATCH_ROLLED_BACK'),
    'Must emit audit log for batch rollback'
  );
});

test('Migration 00011 defines raw conversation minimization purge_staged_raw_content RPC (P1-47)', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  assert.match(
    sql,
    /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.purge_staged_raw_content/i,
    'Must define purge_staged_raw_content function'
  );

  assert.ok(
    sql.includes('raw_content = NULL'),
    'Must null raw conversation content'
  );

  assert.ok(
    sql.includes('is_raw_purged = TRUE'),
    'Must flag is_raw_purged as TRUE'
  );

  assert.ok(
    sql.includes('sha256'),
    'Must preserve SHA-256 cryptographic hash of source content'
  );
});

test('Migration 00011 enforces least privilege access control on RPCs', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  assert.match(
    sql,
    /REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.import_migration_batch\(UUID,\s*UUID\)\s+FROM\s+public,\s*anon/i,
    'Must revoke import RPC from public and anon'
  );
  assert.match(
    sql,
    /REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.rollback_migration_batch\(UUID,\s*TEXT,\s*UUID\)\s+FROM\s+public,\s*anon/i,
    'Must revoke rollback RPC from public and anon'
  );
  assert.match(
    sql,
    /REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.purge_staged_raw_content\(UUID,\s*UUID\)\s+FROM\s+public,\s*anon/i,
    'Must revoke purge RPC from public and anon'
  );
  assert.match(
    sql,
    /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.import_migration_batch\(UUID,\s*UUID\)\s+TO\s+authenticated,\s*service_role/i,
    'Must grant import RPC to authenticated and service_role'
  );
});

test('Migration 00011 contains zero mock or synthetic candidate data', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  assert.doesNotMatch(sql, /INSERT\s+INTO\s+public\.profiles\s+VALUES/i, 'Must not seed mock profile rows directly');
  assert.doesNotMatch(sql, /Zainab|Kamran|Bilal|Farhan|Naveed/i, 'Must not seed synthetic candidate names');
});
