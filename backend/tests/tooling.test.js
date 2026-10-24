import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateMigrationFiles } from '../scripts/validate-migrations.js';
import { getMigrationStatus } from '../scripts/migration-status.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_DIR = path.resolve(__dirname, '..');

test('backend/.env.example exists and contains required configuration keys', () => {
  const envExamplePath = path.join(BACKEND_DIR, '.env.example');
  assert.ok(fs.existsSync(envExamplePath), '.env.example must exist in backend directory');

  const content = fs.readFileSync(envExamplePath, 'utf8');

  // Verify key environment variables are documented
  const requiredKeys = [
    'NODE_ENV',
    'PORT',
    'SUPABASE_REGION',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'DATABASE_URL',
    'CANDIDATE_PHOTO_BUCKET',
  ];

  for (const key of requiredKeys) {
    assert.ok(content.includes(key), `Missing required key "${key}" in .env.example`);
  }
});

test('backend/.env.example contains zero real secrets or credentials', () => {
  const envExamplePath = path.join(BACKEND_DIR, '.env.example');
  const content = fs.readFileSync(envExamplePath, 'utf8');

  // Must not contain real JWT tokens or real postgres passwords
  assert.ok(!content.includes('AIza'), 'Must not contain Google API key');
  assert.ok(!content.includes('ghp_'), 'Must not contain GitHub personal access token');
  assert.ok(!content.includes('sk-'), 'Must not contain OpenAI/Stripe secret key');
  assert.ok(!content.includes('BEGIN PRIVATE KEY'), 'Must not contain private certificates');

  // Must contain clear placeholder indicators
  assert.ok(content.includes('your-anon-token-placeholder'), 'Anon key must use placeholder');
  assert.ok(content.includes('your-service-role-token-placeholder'), 'Service role key must use placeholder');
  assert.ok(content.includes('your-db-password-placeholder'), 'Database URL must use placeholder');

  // Explicit security boundary: service role must be documented as server-side only
  assert.ok(
    content.includes('NEVER EXPOSE TO BROWSER CLIENTS') || content.includes('SERVER-SIDE ONLY'),
    'Service role key must be documented with explicit server-side only warning'
  );
});

test('validateMigrationFiles accepts valid sequential migrations', () => {
  const validFiles = ['00001_initial_schema.sql', '00002_add_siblings.sql', '00003_add_audit_log.sql'];
  const result = validateMigrationFiles(validFiles);

  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
  assert.equal(result.totalFiles, 3);
});

test('validateMigrationFiles detects filename format errors', () => {
  const invalidFiles = ['initial_schema.sql', '0002_short_prefix.sql', '00003-kebab-name.sql'];
  const result = validateMigrationFiles(invalidFiles);

  assert.equal(result.valid, false);
  assert.ok(result.errors.length >= 1, 'Expected at least 1 filename error');
});

test('validateMigrationFiles detects sequence gaps', () => {
  const gapFiles = ['00001_initial_schema.sql', '00003_skipped_number.sql'];
  const result = validateMigrationFiles(gapFiles);

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some((e) => e.includes('Sequence gap detected')),
    'Must report sequence gap error'
  );
});

test('validateMigrationFiles handles empty migration directory gracefully', () => {
  const result = validateMigrationFiles([]);
  assert.equal(result.valid, true);
  assert.equal(result.totalFiles, 0);
  assert.ok(result.warnings.length > 0);
});

test('backend package.json manifest integrity', () => {
  const pkgPath = path.join(BACKEND_DIR, 'package.json');
  assert.ok(fs.existsSync(pkgPath), 'package.json must exist in backend directory');

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  assert.equal(pkg.name, '@gulistan/backend');
  assert.equal(pkg.type, 'module');
  assert.ok(pkg.scripts.test, 'package.json must define a test script');
  assert.ok(pkg.scripts['migrate:validate'], 'package.json must define migrate:validate script');
  assert.ok(pkg.scripts['migrate:status'], 'package.json must define migrate:status script');
});

test('getMigrationStatus inspects migration directory without crashing', () => {
  const status = getMigrationStatus();
  assert.ok(typeof status.count === 'number');
  assert.ok(Array.isArray(status.migrations));
});
