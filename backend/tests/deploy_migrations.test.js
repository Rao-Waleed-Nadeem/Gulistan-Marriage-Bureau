/**
 * @file deploy_migrations.test.js
 * @description Comprehensive unit, contract, and mock-integration tests for
 * the PostgreSQL migration runner and schema_migrations tracking (T-031).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateMigrationChecksum,
  maskDatabaseUrl,
  getMigrationPlan,
  ensureMigrationTable,
  getAppliedMigrations,
  verifyChecksums,
  applySingleMigration,
  runMigrationDeployment
} from '../scripts/deploy-migrations.js';

test('Deploy Migrations: calculateMigrationChecksum handles CRLF and LF identically', () => {
  const unixSql = 'CREATE TABLE test (\n  id serial primary key\n);\n';
  const windowsSql = 'CREATE TABLE test (\r\n  id serial primary key\r\n);\r\n';

  const hashUnix = calculateMigrationChecksum(unixSql);
  const hashWindows = calculateMigrationChecksum(windowsSql);

  assert.equal(hashUnix, hashWindows, 'Hash must be identical across LF and CRLF');
  assert.equal(hashUnix.length, 64);
  assert.match(hashUnix, /^[a-f0-9]{64}$/);
});

test('Deploy Migrations: maskDatabaseUrl conceals passwords safely', () => {
  assert.equal(
    maskDatabaseUrl('postgres://postgres:mySecretPass123@db.supabase.co:5432/postgres'),
    'postgres://postgres:****@db.supabase.co:5432/postgres'
  );
  assert.equal(
    maskDatabaseUrl('postgresql://admin:superSecret@localhost:5432/testdb'),
    'postgresql://admin:****@localhost:5432/testdb'
  );
  assert.equal(maskDatabaseUrl(''), '');
  assert.equal(maskDatabaseUrl('in-memory-simulation'), 'in-memory-simulation');
});

test('Deploy Migrations: getMigrationPlan discovers all migrations in sequence with status', () => {
  const plan = getMigrationPlan([]);

  assert.ok(plan.length >= 4, 'Must discover sequential migrations');
  assert.equal(plan[0].version, '00001');
  assert.equal(plan[1].version, '00002');
  assert.equal(plan[2].version, '00003');
  assert.equal(plan[3].version, '00004');

  for (const item of plan) {
    assert.equal(item.status, 'PENDING');
    assert.equal(item.isApplied, false);
    assert.equal(item.checksum.length, 64);
  }

  // When partially applied
  const partialPlan = getMigrationPlan([
    { version: '00001', checksum: plan[0].checksum },
    { version: '00002', checksum: plan[1].checksum }
  ]);

  assert.equal(partialPlan[0].status, 'ALREADY_APPLIED');
  assert.equal(partialPlan[1].status, 'ALREADY_APPLIED');
  assert.equal(partialPlan[2].status, 'PENDING');
  assert.equal(partialPlan[3].status, 'PENDING');
});

test('Deploy Migrations: verifyChecksums detects tampering of applied migrations', () => {
  const plan = getMigrationPlan([]);
  const validChecksumMap = new Map();
  validChecksumMap.set('00001', plan[0].checksum);
  validChecksumMap.set('00002', plan[1].checksum);

  const appliedPlan = plan.map((p, idx) => ({
    ...p,
    isApplied: idx < 2
  }));

  // Valid verification
  const verified = verifyChecksums(appliedPlan, validChecksumMap);
  assert.equal(verified.length, 2);
  assert.equal(verified[0].verified, true);

  // Tampered verification: recorded checksum does not match disk checksum
  const tamperedMap = new Map();
  tamperedMap.set('00001', '0000000000000000000000000000000000000000000000000000000000000000'); // altered

  assert.throws(() => {
    verifyChecksums(appliedPlan, tamperedMap);
  }, /Checksum mismatch for migration version 00001/);
});

test('Deploy Migrations: ensureMigrationTable issues CREATE TABLE IF NOT EXISTS for schema_migrations', async () => {
  const executedQueries = [];
  const mockClient = {
    async query(sql) {
      executedQueries.push(sql);
      return { rows: [] };
    }
  };

  await ensureMigrationTable(mockClient);

  assert.equal(executedQueries.length, 1);
  assert.ok(executedQueries[0].includes('CREATE TABLE IF NOT EXISTS public.schema_migrations'));
  assert.ok(executedQueries[0].includes('version VARCHAR(20) PRIMARY KEY'));
  assert.ok(executedQueries[0].includes('checksum VARCHAR(64) NOT NULL'));
  assert.ok(executedQueries[0].includes('applied_at TIMESTAMPTZ'));
  assert.ok(executedQueries[0].includes('execution_time_ms INTEGER'));
});

test('Deploy Migrations: getAppliedMigrations queries schema_migrations in ascending order', async () => {
  const mockRows = [
    { version: '00001', name: '00001_initial_schema_baseline.sql', checksum: 'hash1', applied_at: '2026-10-24T00:00:00Z', execution_time_ms: 15 },
    { version: '00002', name: '00002_financial_ledger.sql', checksum: 'hash2', applied_at: '2026-10-24T01:00:00Z', execution_time_ms: 8 }
  ];

  const queries = [];
  const mockClient = {
    async query(sql) {
      queries.push(sql);
      if (sql.includes('SELECT version, name, checksum')) {
        return { rows: mockRows };
      }
      return { rows: [] };
    }
  };

  const rows = await getAppliedMigrations(mockClient);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].version, '00001');
  assert.equal(rows[1].version, '00002');
  assert.ok(queries.some(q => q.includes('ORDER BY version ASC')));
});

test('Deploy Migrations: applySingleMigration executes SQL and inserts record into schema_migrations', async () => {
  const executed = [];
  const mockClient = {
    async query(sql, params) {
      executed.push({ sql, params });
      return { rows: [] };
    }
  };

  const plan = getMigrationPlan([]);
  const item = plan[0]; // 00001

  const res = await applySingleMigration(mockClient, item);

  assert.equal(res.version, '00001');
  assert.equal(res.status, 'APPLIED');
  assert.ok(typeof res.executionTimeMs === 'number');

  // Verify first query was the SQL migration content
  assert.ok(executed[0].sql.includes('Initial Schema & Access Baseline'));

  // Verify second query was the schema_migrations insert
  assert.ok(executed[1].sql.includes('INSERT INTO public.schema_migrations'));
  assert.equal(executed[1].params[0], '00001');
  assert.equal(executed[1].params[1], item.file);
  assert.equal(executed[1].params[2], item.checksum);
});

test('Deploy Migrations: applySingleMigration issues ROLLBACK on SQL error', async () => {
  const executed = [];
  const mockClient = {
    async query(sql, params) {
      executed.push({ sql, params });
      if (sql.includes('Initial Schema')) {
        throw new Error('syntax error at or near "BROKEN"');
      }
      return { rows: [] };
    }
  };

  const plan = getMigrationPlan([]);
  const item = plan[0];

  await assert.rejects(async () => {
    await applySingleMigration(mockClient, item);
  }, /Failed to apply migration 00001.*syntax error/);

  // Must have called ROLLBACK;
  assert.ok(executed.some(e => e.sql === 'ROLLBACK;'));
});

test('Deploy Migrations: runMigrationDeployment with mock client applies all 4 migrations on fresh database', async () => {
  const executedSql = [];
  const appliedRecords = [];

  const mockClient = {
    async query(sql, params) {
      executedSql.push({ sql, params });
      if (sql.includes('SELECT version, name, checksum')) {
        return { rows: [...appliedRecords] };
      }
      if (sql.includes('INSERT INTO public.schema_migrations')) {
        appliedRecords.push({
          version: params[0],
          name: params[1],
          checksum: params[2],
          execution_time_ms: params[3]
        });
        return { rows: [] };
      }
      return { rows: [] };
    }
  };

  const report = await runMigrationDeployment({
    client: mockClient,
    dryRun: false
  });

  assert.equal(report.success, true);
  assert.equal(report.mode, 'LIVE_DATABASE_EXECUTION');
  assert.equal(report.dryRun, false);
  assert.ok(report.totalDiscovered >= 4);
  assert.equal(report.alreadyApplied, 0);
  assert.equal(report.pendingCount, report.totalDiscovered);
  assert.equal(report.appliedInThisRun.length, report.totalDiscovered);

  assert.equal(report.appliedInThisRun[0].version, '00001');
  assert.equal(report.appliedInThisRun[1].version, '00002');
  assert.equal(report.appliedInThisRun[2].version, '00003');
  assert.equal(report.appliedInThisRun[3].version, '00004');

  for (const item of report.appliedInThisRun) {
    assert.equal(item.status, 'APPLIED');
  }
});

test('Deploy Migrations: runMigrationDeployment with verifyOnly skips pending migrations', async () => {
  const plan = getMigrationPlan([]);
  const mockRows = [
    { version: '00001', name: plan[0].file, checksum: plan[0].checksum, applied_at: new Date().toISOString(), execution_time_ms: 10 }
  ];

  const mockClient = {
    async query(sql) {
      if (sql.includes('SELECT version, name, checksum')) {
        return { rows: mockRows };
      }
      return { rows: [] };
    }
  };

  const report = await runMigrationDeployment({
    client: mockClient,
    verifyOnly: true
  });

  assert.equal(report.success, true);
  assert.equal(report.mode, 'LIVE_DATABASE_EXECUTION');
  assert.equal(report.verifiedChecksums.length, 1);
  assert.equal(report.appliedInThisRun.length, 0, 'Must not apply pending migrations in verify-only mode');
  assert.ok(report.message.includes('Checksum verification complete'));
});
