#!/usr/bin/env node

/**
 * Migration Status Inspector — Gulistan Marriage Bureau
 * Lists all migration files and summarizes sequence health and live database state.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getMigrationPlan, getAppliedMigrations, maskDatabaseUrl, DEFAULT_MIGRATIONS_TABLE } from './deploy-migrations.js';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATIONS_DIR = path.resolve(__dirname, '../migrations');

export function getMigrationStatus(baseDir = MIGRATIONS_DIR) {
  if (!fs.existsSync(baseDir)) {
    return { count: 0, migrations: [] };
  }

  const files = fs
    .readdirSync(baseDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const migrations = files.map((filename) => {
    const filePath = path.join(baseDir, filename);
    const stats = fs.statSync(filePath);
    return {
      filename,
      sizeBytes: stats.size,
      updatedAt: stats.mtime.toISOString(),
    };
  });

  return {
    count: migrations.length,
    migrations,
  };
}

export async function runStatusCli() {
  const status = getMigrationStatus();
  console.log('=== Database Migration Status ===');
  console.log(`Directory: ${MIGRATIONS_DIR}`);
  console.log(`Total Migrations: ${status.count}\n`);

  if (status.count === 0) {
    console.log('No migration files found yet.');
    return;
  }

  const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  const isPlaceholder = dbUrl && (dbUrl.includes('placeholder') || dbUrl.includes('your-db-password-placeholder'));

  if (!dbUrl || isPlaceholder) {
    console.log('[Mode: Offline Disk Inspection]');
    console.log('| Sequence | Filename | Size (bytes) | Last Modified |');
    console.log('|---|---|---|---|');
    status.migrations.forEach((m) => {
      console.log(`| ${m.filename.slice(0, 5)} | ${m.filename} | ${m.sizeBytes} | ${m.updatedAt} |`);
    });
    return;
  }

  // Live database connection inspection
  console.log(`[Mode: Live PostgreSQL Database Inspection] (${maskDatabaseUrl(dbUrl)})`);
  const isLocal = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');
  const client = new pg.Client({
    connectionString: dbUrl,
    ssl: isLocal ? false : { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const appliedRows = await getAppliedMigrations(client, DEFAULT_MIGRATIONS_TABLE);
    const plan = getMigrationPlan(appliedRows, MIGRATIONS_DIR);

    console.log(`Applied: ${appliedRows.length} | Pending: ${plan.filter(p => !p.isApplied).length}\n`);
    console.log('| Sequence | Filename | Checksum (prefix) | Status | Applied At |');
    console.log('|---|---|---|---|---|');
    plan.forEach((item) => {
      const dbRow = appliedRows.find(r => r.version === item.version);
      const appliedAt = dbRow?.applied_at ? new Date(dbRow.applied_at).toISOString() : '—';
      console.log(`| ${item.version} | ${item.file} | ${item.checksum.slice(0, 10)}... | ${item.status} | ${appliedAt} |`);
    });
  } catch (err) {
    console.warn(`[Warning] Could not inspect live database: ${err.message}`);
    console.log('| Sequence | Filename | Size (bytes) | Last Modified |');
    console.log('|---|---|---|---|');
    status.migrations.forEach((m) => {
      console.log(`| ${m.filename.slice(0, 5)} | ${m.filename} | ${m.sizeBytes} | ${m.updatedAt} |`);
    });
  } finally {
    await client.end().catch(() => {});
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runStatusCli().catch(err => {
    console.error('Failed to run migration status:', err);
    process.exit(1);
  });
}
