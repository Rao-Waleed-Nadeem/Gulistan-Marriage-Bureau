#!/usr/bin/env node

/**
 * Migration Status Inspector — Gulistan Marriage Bureau
 * Lists all migration files and summarizes sequence health.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

export function runStatusCli() {
  const status = getMigrationStatus();
  console.log('=== Database Migration Status ===');
  console.log(`Directory: ${MIGRATIONS_DIR}`);
  console.log(`Total Migrations: ${status.count}\n`);

  if (status.count === 0) {
    console.log('No migration files found yet. Initial migration begins under T-004.');
    return;
  }

  console.log('| Sequence | Filename | Size (bytes) | Last Modified |');
  console.log('|---|---|---|---|');
  status.migrations.forEach((m) => {
    console.log(`| ${m.filename.slice(0, 5)} | ${m.filename} | ${m.sizeBytes} | ${m.updatedAt} |`);
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runStatusCli();
}
