#!/usr/bin/env node

/**
 * Migration Validator — Gulistan Marriage Bureau
 * Validates migration file naming, sequential order, and basic SQL safety invariants.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATIONS_DIR = path.resolve(__dirname, '../migrations');

/**
 * @typedef {Object} MigrationValidationResult
 * @property {boolean} valid
 * @property {number} totalFiles
 * @property {string[]} errors
 * @property {string[]} warnings
 * @property {string[]} files
 */

/**
 * Validates a list of SQL migration files.
 * @param {string[]} fileList Array of filenames to validate
 * @param {string} [baseDir] Base directory containing migration files
 * @returns {MigrationValidationResult}
 */
export function validateMigrationFiles(fileList, baseDir = MIGRATIONS_DIR) {
  const errors = [];
  const warnings = [];
  const sqlFiles = fileList
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (sqlFiles.length === 0) {
    return {
      valid: true,
      totalFiles: 0,
      errors: [],
      warnings: ['No SQL migration files found in migrations directory.'],
      files: [],
    };
  }

  const filePattern = /^(\d{5})_([a-z0-9_]+)\.sql$/;
  let expectedIndex = 1;

  for (const filename of sqlFiles) {
    const match = filename.match(filePattern);
    if (!match) {
      errors.push(`Invalid filename "${filename}". Expected format: NNNNN_description.sql (e.g. 00001_initial_schema.sql)`);
      continue;
    }

    const fileIndex = parseInt(match[1], 10);
    if (fileIndex !== expectedIndex) {
      errors.push(`Sequence gap detected for "${filename}". Expected prefix: ${String(expectedIndex).padStart(5, '0')}, found: ${match[1]}`);
    }
    expectedIndex++;

    // Content safety checks
    const filePath = path.join(baseDir, filename);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');

      if (/DROP\s+DATABASE/i.test(content)) {
        errors.push(`Destructive statement "DROP DATABASE" detected in "${filename}".`);
      }

      if (/DROP\s+TABLE\s+(?!IF\s+EXISTS)/i.test(content)) {
        warnings.push(`Unconditional "DROP TABLE" detected in "${filename}". Consider using "DROP TABLE IF EXISTS".`);
      }

      if (!/BEGIN;/i.test(content) || !/COMMIT;/i.test(content)) {
        warnings.push(`Migration "${filename}" does not appear to be wrapped in a transaction (BEGIN; ... COMMIT;).`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    totalFiles: sqlFiles.length,
    errors,
    warnings,
    files: sqlFiles,
  };
}

/**
 * CLI execution entrypoint
 */
export function runCli() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error(`Migrations directory does not exist at: ${MIGRATIONS_DIR}`);
    process.exit(1);
  }

  const allEntries = fs.readdirSync(MIGRATIONS_DIR);
  const result = validateMigrationFiles(allEntries, MIGRATIONS_DIR);

  console.log('--- Migration Validation Report ---');
  console.log(`Directory: ${MIGRATIONS_DIR}`);
  console.log(`SQL files inspected: ${result.totalFiles}`);

  if (result.warnings.length > 0) {
    console.log('\n[Warnings]:');
    result.warnings.forEach((w) => console.warn(`  ⚠️  ${w}`));
  }

  if (!result.valid) {
    console.error('\n[Validation Errors]:');
    result.errors.forEach((e) => console.error(`  ❌ ${e}`));
    console.error('\nValidation FAILED.');
    process.exit(1);
  }

  console.log('\n✅ Validation PASSED.');
  process.exit(0);
}

// Run CLI when invoked directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runCli();
}
