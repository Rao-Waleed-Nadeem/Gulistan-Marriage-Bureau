/**
 * @file backup_restore.test.js
 * @description Automated verification test for database and media restore drill,
 * checksum validation, PITR point-in-time recovery, ledger reconciliation post-restore,
 * and photo privacy rules.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeChecksum,
  createSyntheticDatabaseState,
  exportBackup,
  executeRestoreDrill,
  executePointInTimeRestore,
} from '../scripts/restore-drill.js';

test('Restore Drill: computeChecksum produces deterministic SHA-256 hash', () => {
  const data1 = { a: 1, b: 'test' };
  const data2 = { a: 1, b: 'test' };
  const data3 = { a: 2, b: 'test' };

  assert.equal(computeChecksum(data1), computeChecksum(data2));
  assert.notEqual(computeChecksum(data1), computeChecksum(data3));
});

test('Restore Drill: exportBackup generates intact bundle with valid payload and checksum', () => {
  const dbState = createSyntheticDatabaseState();
  const backup = exportBackup(dbState);

  assert.ok(backup.backupId.startsWith('bkp-'));
  assert.ok(backup.timestamp);
  assert.equal(backup.checksum, computeChecksum(dbState));
  assert.equal(backup.payload.profiles.length, 3);
  assert.equal(backup.payload.financialTransactions.length, 3);
  assert.equal(backup.payload.appSettings.length, 2);
  assert.equal(backup.payload.externalMatchmakers.length, 1);
});

test('Restore Drill: executeRestoreDrill restores state, reconciles ledger, and complies with OPEN-008 photo purge', () => {
  const originalState = createSyntheticDatabaseState();
  const backup = exportBackup(originalState);

  // Simulate catastrophic disaster / database wipe
  const corruptedState = {
    profiles: [],
    candidateConsents: [],
    financialTransactions: [],
    photoObjects: [],
    appSettings: [],
    externalMatchmakers: [],
  };

  const result = executeRestoreDrill(corruptedState, backup);

  assert.equal(result.success, true);
  assert.equal(result.restoredCounts.profiles, 3);
  assert.equal(result.restoredCounts.candidateConsents, 3);
  assert.equal(result.restoredCounts.financialTransactions, 3);
  assert.equal(result.restoredCounts.photos, 3);
  assert.equal(result.restoredCounts.appSettings, 2);
  assert.equal(result.restoredCounts.externalMatchmakers, 1);

  // Financial reconciliation check (OPEN-010 Net Balance convention)
  assert.equal(result.ledgerReconciliation.reconciled, true);
  assert.equal(result.ledgerReconciliation.totalPayable, 25000);
  assert.equal(result.ledgerReconciliation.totalReceivable, 15000);
  assert.equal(result.ledgerReconciliation.netLiabilities, 10000);
  assert.equal(result.ledgerReconciliation.netBalance, -10000);

  // OPEN-008 Photo privacy check: purged photo must not be accessible
  assert.equal(result.purgedPhotoCheck.privacyCompliant, true);
  assert.equal(result.purgedPhotoCheck.resurrectedCount, 0);
  assert.equal(result.purgedPhotoCheck.purgedCount, 1);
});

test('Restore Drill: executeRestoreDrill detects and rejects tampered backup artifacts', () => {
  const originalState = createSyntheticDatabaseState();
  const backup = exportBackup(originalState);

  // Tamper with payload
  backup.payload.financialTransactions[0].amount_pkr = 999999;

  assert.throws(() => {
    executeRestoreDrill({}, backup);
  }, /CORRUPT_BACKUP/);
});

test('Restore Drill: executePointInTimeRestore recovers exact target state and drops post-incident updates', () => {
  const baseState = createSyntheticDatabaseState();
  const baseSnapshot = exportBackup(baseState);

  // WAL log with events before and after incident timestamp
  const walLog = [
    {
      timestamp: '2026-11-02T13:00:00Z',
      table: 'profiles',
      action: 'insert',
      data: { id: 'prof-004', gender: 'male', age: 31, status: 'active', religion: 'islam', aqeedah: 'sunni' },
    },
    {
      timestamp: '2026-11-02T13:30:00Z',
      table: 'financialTransactions',
      action: 'insert',
      data: { id: 'tx-004', partner_name: 'Al-Madina', transaction_type: 'receivable', amount_pkr: 12000, status: 'pending', currency: 'PKR' },
    },
    // Incidental/corrupted event occurring at 14:05:00Z
    {
      timestamp: '2026-11-02T14:05:00Z',
      table: 'profiles',
      action: 'insert',
      data: { id: 'prof-CORRUPTED', gender: 'male', age: 99, status: 'restricted', religion: 'unknown', aqeedah: 'unknown' },
    },
  ];

  // Target PITR time: 13:45:00Z (before corruption)
  const pitrResult = executePointInTimeRestore(baseSnapshot, walLog, '2026-11-02T13:45:00Z');

  assert.equal(pitrResult.success, true);
  assert.equal(pitrResult.appliedTransactions, 2);
  assert.equal(pitrResult.excludedTransactions, 1);
  assert.equal(pitrResult.restoredProfilesCount, 4); // 3 original + 1 valid WAL
  assert.equal(pitrResult.restoredTxCount, 4); // 3 original + 1 valid WAL

  // Verify corrupted profile was safely excluded
  const hasCorrupted = pitrResult.state.profiles.some(p => p.id === 'prof-CORRUPTED');
  assert.equal(hasCorrupted, false);
});
