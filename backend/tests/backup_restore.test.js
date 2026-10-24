/**
 * @file backup_restore.test.js
 * @description Automated verification test for database and media restore drill,
 * checksum validation, ledger reconciliation post-restore, and photo privacy rules.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeChecksum,
  createSyntheticDatabaseState,
  exportBackup,
  executeRestoreDrill
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
});

test('Restore Drill: executeRestoreDrill restores state, reconciles ledger, and complies with OPEN-008 photo purge', () => {
  const originalState = createSyntheticDatabaseState();
  const backup = exportBackup(originalState);

  // Simulate catastrophic disaster / database wipe
  const corruptedState = {
    profiles: [],
    candidateConsents: [],
    financialTransactions: [],
    photoObjects: []
  };

  const result = executeRestoreDrill(corruptedState, backup);

  assert.equal(result.success, true);
  assert.equal(result.restoredCounts.profiles, 3);
  assert.equal(result.restoredCounts.candidateConsents, 3);
  assert.equal(result.restoredCounts.financialTransactions, 3);
  assert.equal(result.restoredCounts.photos, 3);

  // Financial reconciliation check
  assert.equal(result.ledgerReconciliation.reconciled, true);
  assert.equal(result.ledgerReconciliation.totalPayable, 25000);
  assert.equal(result.ledgerReconciliation.totalReceivable, 15000);
  assert.equal(result.ledgerReconciliation.netLiabilities, 10000);

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
