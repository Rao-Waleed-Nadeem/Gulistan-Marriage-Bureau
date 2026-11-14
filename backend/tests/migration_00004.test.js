import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATION_PATH = path.resolve(__dirname, '../migrations/00004_staged_migration_batches.sql');

test('Migration 00004 exists and is wrapped in a transaction block', () => {
  assert.ok(fs.existsSync(MIGRATION_PATH), 'Migration 00004 must exist');
  const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');

  assert.ok(sql.startsWith('--') || sql.includes('BEGIN;'), 'Migration must contain transaction block');
  assert.ok(sql.includes('BEGIN;'), 'Must begin with BEGIN;');
  assert.ok(sql.includes('COMMIT;'), 'Must end with COMMIT;');
});

test('Migration 00004 defines migration batches and staged records tables with constraints', () => {
  const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');

  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.migration_batches'), 'Must define migration_batches');
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.migration_staged_records'), 'Must define migration_staged_records');

  // Source type constraint
  assert.ok(sql.includes("source_type IN ('whatsapp_chat_export', 'phone_gallery_archive', 'csv_template')"));

  // Checksum length constraint (SHA-256 = 64 hex chars)
  assert.ok(sql.includes('char_length(source_checksum) = 64'));

  // Batch status constraint
  assert.ok(sql.includes("'staged', 'dry_run_completed', 'approved_by_owner', 'imported', 'reconciled', 'rolled_back'"));

  // Unique constraint on (batch_id, row_index)
  assert.ok(sql.includes('CONSTRAINT uq_migration_batch_row UNIQUE (batch_id, row_index)'));
});

test('Migration 00004 enables Row-Level Security and enforces least privilege', () => {
  const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');

  assert.ok(sql.includes('ALTER TABLE public.migration_batches ENABLE ROW LEVEL SECURITY;'));
  assert.ok(sql.includes('ALTER TABLE public.migration_staged_records ENABLE ROW LEVEL SECURITY;'));

  assert.ok(sql.includes('REVOKE ALL ON TABLE public.migration_batches FROM public, anon;'));
  assert.ok(sql.includes('REVOKE ALL ON TABLE public.migration_staged_records FROM public, anon;'));

  assert.ok(sql.includes('GRANT SELECT, INSERT, UPDATE ON TABLE public.migration_batches TO authenticated;'));
  assert.ok(sql.includes('GRANT SELECT, INSERT, UPDATE ON TABLE public.migration_staged_records TO authenticated;'));

  assert.ok(sql.includes('GRANT ALL ON TABLE public.migration_batches TO service_role;'));
  assert.ok(sql.includes('GRANT ALL ON TABLE public.migration_staged_records TO service_role;'));

  // Staff-only policies
  assert.ok(sql.includes('public.auth_is_staff()'));
});

test('Migration 00004 does not contain mock or production candidate data seeding', () => {
  const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');

  assert.ok(!sql.includes('INSERT INTO public.profiles'), 'Must not insert candidate profiles');
  assert.ok(!sql.includes('Fatima Tariq'), 'Must not contain mock candidate names');
  assert.ok(!sql.includes('Haji Aslam'), 'Must not contain mock matchmaker names');
});
