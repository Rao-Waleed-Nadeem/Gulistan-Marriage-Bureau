/**
 * @file deployment_smoke.test.js
 * @description Automated unit and contract tests for live migration deployment runner
 * and staging/production smoke-test harness.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateMigrationChecksum,
  getMigrationPlan,
  runMigrationDeployment
} from '../scripts/deploy-migrations.js';
import {
  validateEnvironmentSanity,
  validateSecurityBaseline,
  validateStorageSecurity,
  runSmokeTests
} from '../scripts/smoke-test.js';

test('Deploy Migrations: calculateMigrationChecksum produces deterministic SHA-256 hashes', () => {
  const sql = 'CREATE TABLE test (id serial primary key);';
  const hash1 = calculateMigrationChecksum(sql);
  const hash2 = calculateMigrationChecksum(sql);

  assert.equal(hash1, hash2);
  assert.equal(hash1.length, 64);
  assert.match(hash1, /^[a-f0-9]{64}$/);
});

test('Deploy Migrations: getMigrationPlan discovers sequential SQL migrations with valid statuses', () => {
  const plan = getMigrationPlan([]);

  assert.ok(plan.length >= 2, 'Must discover at least 2 migrations');
  assert.equal(plan[0].version, '00001');
  assert.equal(plan[1].version, '00002');
  assert.equal(plan[0].status, 'PENDING');
  assert.equal(plan[1].status, 'PENDING');

  // When version 00001 is already applied
  const partialPlan = getMigrationPlan(['00001']);
  assert.equal(partialPlan[0].status, 'ALREADY_APPLIED');
  assert.equal(partialPlan[1].status, 'PENDING');
});

test('Deploy Migrations: runMigrationDeployment simulates migration execution cleanly in dry-run mode', async () => {
  const report = await runMigrationDeployment({ dryRun: true });

  assert.equal(report.success, true);
  assert.equal(report.dryRun, true);
  assert.equal(report.mode, 'DRY_RUN_OR_SIMULATION');
  assert.ok(report.totalDiscovered >= 2);
  assert.equal(report.appliedInThisRun.length, report.pendingCount);
  assert.equal(report.appliedInThisRun[0].status, 'SIMULATED_SUCCESS');
});

test('Smoke Test: validateEnvironmentSanity detects missing credentials and blocks leaked service keys', () => {
  // Test 1: Empty environment
  const emptyRes = validateEnvironmentSanity({});
  assert.equal(emptyRes.healthy, false);
  assert.ok(emptyRes.issues.some(i => i.includes('Missing SUPABASE_URL')));

  // Test 2: Valid safe public client configuration
  const validRes = validateEnvironmentSanity({
    VITE_SUPABASE_URL: 'https://test-project.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-anon-key'
  });
  assert.equal(validRes.healthy, true);
  assert.equal(validRes.issues.length, 0);

  // Test 3: Leaked service role secret in VITE_ variable
  const leakedRes = validateEnvironmentSanity({
    VITE_SUPABASE_URL: 'https://test-project.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    VITE_SUPABASE_SERVICE_ROLE_KEY: 'secret-service-key-that-must-be-blocked'
  });
  assert.equal(leakedRes.healthy, false);
  assert.ok(leakedRes.issues.some(i => i.includes('CRITICAL: Service role secret detected')));
});

test('Smoke Test: validateSecurityBaseline verifies RLS across all core tables', () => {
  const baseline = validateSecurityBaseline(['profiles', 'candidate_consents', 'audit_events', 'financial_transactions']);

  assert.equal(baseline.allRlsEnforced, true);
  assert.equal(baseline.tables.length, 4);
  for (const t of baseline.tables) {
    assert.equal(t.rlsEnforced, true);
    assert.equal(t.anonAccessRevoked, true);
  }
});

test('Smoke Test: validateStorageSecurity confirms private photo bucket and 48-hour signed URLs', () => {
  const storage = validateStorageSecurity('candidate-photos');

  assert.equal(storage.bucket, 'candidate-photos');
  assert.equal(storage.isPrivate, true);
  assert.equal(storage.publicAccessBlocked, true);
  assert.equal(storage.signedUrlExpiryHours, 48);
  assert.equal(storage.zeroLoggingEnforced, true);
});

test('Smoke Test: runSmokeTests produces structured diagnostic report', async () => {
  const report = await runSmokeTests({
    env: {
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_ANON_KEY: 'test-anon-token',
      CANDIDATE_PHOTO_BUCKET: 'candidate-photos'
    }
  });

  assert.equal(report.passed, true);
  assert.ok(report.timestamp);
  assert.equal(report.environmentSanity.healthy, true);
  assert.equal(report.securityBaseline.allRlsEnforced, true);
  assert.equal(report.storageSecurity.isPrivate, true);
});
