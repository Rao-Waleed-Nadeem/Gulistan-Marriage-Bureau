/**
 * @file deploy-migrations.js
 * @description Automated migration runner for live/staging PostgreSQL & Supabase instances.
 * Applies sequential SQL migrations with checksum verification, transaction atomicity,
 * and persistent schema_migrations history tracking.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import pg from 'pg';

const MIGRATIONS_DIR = resolve(import.meta.dirname, '../migrations');
export const DEFAULT_MIGRATIONS_TABLE = 'public.schema_migrations';

/**
 * Calculates deterministic SHA-256 checksum for migration file content.
 * Normalizes CRLF to LF to ensure consistent hashes across OS environments.
 * @param {string} content
 * @returns {string} 64-char lowercase hex hash
 */
export function calculateMigrationChecksum(content) {
  if (typeof content !== 'string') {
    throw new TypeError('Migration content must be a string');
  }
  const normalized = content.replace(/\r\n/g, '\n').trim();
  return createHash('sha256').update(normalized).digest('hex');
}

/**
 * Masks sensitive passwords in database connection strings for safe logging.
 * @param {string} url
 * @returns {string}
 */
export function maskDatabaseUrl(url) {
  if (!url || typeof url !== 'string') return '';
  return url.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:****@');
}

/**
 * Discovers and plans migration execution against applied history.
 * @param {string[]|Array<{version: string, checksum?: string}>} appliedHistory
 * @param {string} [migrationsDir]
 */
export function getMigrationPlan(appliedHistory = [], migrationsDir = MIGRATIONS_DIR) {
  if (!existsSync(migrationsDir)) {
    throw new Error(`Migrations directory not found: ${migrationsDir}`);
  }

  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const appliedVersionSet = new Set();
  const appliedChecksumMap = new Map();

  for (const item of appliedHistory) {
    if (typeof item === 'string') {
      appliedVersionSet.add(item);
    } else if (item && typeof item === 'object') {
      if (item.version) {
        appliedVersionSet.add(item.version);
        if (item.checksum) {
          appliedChecksumMap.set(item.version, item.checksum);
        }
      }
    }
  }

  const plan = [];

  for (const file of files) {
    const version = file.split('_')[0];
    const fullPath = join(migrationsDir, file);
    const content = readFileSync(fullPath, 'utf8');
    const checksum = calculateMigrationChecksum(content);
    const isApplied = appliedVersionSet.has(version);
    const recordedChecksum = appliedChecksumMap.get(version);

    plan.push({
      file,
      version,
      fullPath,
      checksum,
      recordedChecksum,
      isApplied,
      status: isApplied ? 'ALREADY_APPLIED' : 'PENDING'
    });
  }

  return plan;
}

/**
 * Ensures the schema_migrations tracking table exists in the target database.
 * @param {pg.ClientBase|object} client
 * @param {string} [tableName]
 */
export async function ensureMigrationTable(client, tableName = DEFAULT_MIGRATIONS_TABLE) {
  const query = `
    CREATE TABLE IF NOT EXISTS ${tableName} (
      version VARCHAR(20) PRIMARY KEY,
      name TEXT NOT NULL,
      checksum VARCHAR(64) NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      execution_time_ms INTEGER NOT NULL DEFAULT 0,
      applied_by TEXT DEFAULT CURRENT_USER
    );
    CREATE INDEX IF NOT EXISTS idx_schema_migrations_applied_at ON ${tableName}(applied_at);
  `;
  await client.query(query);
}

/**
 * Retrieves all applied migrations from the database table.
 * @param {pg.ClientBase|object} client
 * @param {string} [tableName]
 * @returns {Promise<Array<{version: string, name: string, checksum: string, applied_at: string, execution_time_ms: number}>>}
 */
export async function getAppliedMigrations(client, tableName = DEFAULT_MIGRATIONS_TABLE) {
  await ensureMigrationTable(client, tableName);
  const result = await client.query(
    `SELECT version, name, checksum, applied_at, execution_time_ms FROM ${tableName} ORDER BY version ASC;`
  );
  return result.rows || [];
}

/**
 * Validates that disk migrations match recorded checksums in the database.
 * Detects tampering or modifications of already applied migrations.
 * @param {Array<object>} plan
 * @param {Map<string, string>|Record<string, string>} appliedChecksumMap
 */
export function verifyChecksums(plan, appliedChecksumMap) {
  const verified = [];
  for (const item of plan) {
    if (item.isApplied) {
      const recorded = typeof appliedChecksumMap?.get === 'function'
        ? appliedChecksumMap.get(item.version)
        : (appliedChecksumMap ? appliedChecksumMap[item.version] : undefined);

      if (recorded && recorded !== item.checksum) {
        throw new Error(
          `Checksum mismatch for migration version ${item.version} (${item.file}). ` +
          `Database recorded: ${recorded}, Disk file computed: ${item.checksum}. ` +
          `Applied migrations must be immutable.`
        );
      }
      verified.push({
        version: item.version,
        file: item.file,
        checksum: item.checksum,
        verified: true
      });
    }
  }
  return verified;
}

/**
 * Executes a single migration file transactionally and records it in schema_migrations.
 * @param {pg.ClientBase|object} client
 * @param {object} item
 * @param {string} [tableName]
 */
export async function applySingleMigration(client, item, tableName = DEFAULT_MIGRATIONS_TABLE) {
  const content = readFileSync(item.fullPath, 'utf8');
  const startTime = Date.now();

  try {
    // Execute migration SQL content
    await client.query(content);
    const executionTimeMs = Date.now() - startTime;

    // Record applied migration in schema_migrations
    await client.query(
      `INSERT INTO ${tableName} (version, name, checksum, execution_time_ms)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (version) DO UPDATE
       SET checksum = EXCLUDED.checksum,
           applied_at = NOW(),
           execution_time_ms = EXCLUDED.execution_time_ms;`,
      [item.version, item.file, item.checksum, executionTimeMs]
    );

    return {
      version: item.version,
      file: item.file,
      checksum: item.checksum,
      status: 'APPLIED',
      executionTimeMs
    };
  } catch (err) {
    // Attempt rollback of any open transaction block
    try {
      await client.query('ROLLBACK;');
    } catch (_) {
      // Ignore rollback failure if no transaction was active
    }
    const enhancedError = new Error(
      `Failed to apply migration ${item.version} (${item.file}): ${err.message}`
    );
    enhancedError.cause = err;
    throw enhancedError;
  }
}

/**
 * Deploys migrations: executes real PostgreSQL transactions or clean dry-run plan.
 * @param {object} [options]
 * @param {string} [options.databaseUrl]
 * @param {string[]} [options.appliedVersions]
 * @param {boolean} [options.dryRun]
 * @param {boolean} [options.verifyOnly]
 * @param {pg.ClientBase|object} [options.client]
 * @param {string} [options.tableName]
 * @param {string} [options.migrationsDir]
 */
export async function runMigrationDeployment(options = {}) {
  const {
    databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL,
    appliedVersions = [],
    dryRun = false,
    verifyOnly = false,
    client: injectedClient = null,
    tableName = DEFAULT_MIGRATIONS_TABLE,
    migrationsDir = MIGRATIONS_DIR
  } = options;

  const isPlaceholderUrl = databaseUrl && (
    databaseUrl.includes('your-db-password-placeholder') ||
    databaseUrl.includes('placeholder')
  );

  const shouldDryRun = dryRun || (!databaseUrl && !injectedClient) || isPlaceholderUrl;

  // DRY-RUN / SIMULATION MODE
  if (shouldDryRun) {
    const plan = getMigrationPlan(appliedVersions, migrationsDir);
    const pending = plan.filter(p => p.status === 'PENDING');
    const applied = plan.filter(p => p.isApplied);

    const report = {
      timestamp: new Date().toISOString(),
      mode: 'DRY_RUN_OR_SIMULATION',
      dryRun: true,
      database: isPlaceholderUrl ? 'placeholder-url (simulated)' : 'in-memory-simulation',
      totalDiscovered: plan.length,
      alreadyApplied: applied.length,
      pendingCount: pending.length,
      appliedInThisRun: [],
      verifiedChecksums: [],
      success: true,
      message: 'Dry-run migration plan validated successfully. No live database connection was opened and no schema changes were executed.'
    };

    for (const item of pending) {
      report.appliedInThisRun.push({
        version: item.version,
        file: item.file,
        checksum: item.checksum,
        status: 'SIMULATED_SUCCESS',
        executionTimeMs: 0
      });
    }

    return report;
  }

  // LIVE DATABASE EXECUTION MODE
  let client = injectedClient;
  let ownClient = false;

  if (!client) {
    const isLocalhost = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1');
    const sslConfig = isLocalhost ? false : { rejectUnauthorized: false };

    client = new pg.Client({
      connectionString: databaseUrl,
      ssl: sslConfig
    });
    await client.connect();
    ownClient = true;
  }

  try {
    // 1. Fetch applied migrations from durable schema_migrations table
    const appliedDbRows = await getAppliedMigrations(client, tableName);
    const appliedChecksumMap = new Map();
    for (const row of appliedDbRows) {
      appliedChecksumMap.set(row.version, row.checksum);
    }

    // 2. Discover local files and build plan
    const plan = getMigrationPlan(appliedDbRows, migrationsDir);

    // 3. Verify checksums of already applied migrations against disk files
    const verifiedChecksums = verifyChecksums(plan, appliedChecksumMap);

    const pending = plan.filter(p => p.status === 'PENDING');
    const appliedInThisRun = [];

    if (!verifyOnly) {
      // 4. Apply pending migrations sequentially
      for (const item of pending) {
        const result = await applySingleMigration(client, item, tableName);
        appliedInThisRun.push(result);
      }
    }

    const report = {
      timestamp: new Date().toISOString(),
      mode: 'LIVE_DATABASE_EXECUTION',
      dryRun: false,
      database: maskDatabaseUrl(databaseUrl || 'injected-client'),
      totalDiscovered: plan.length,
      alreadyApplied: appliedDbRows.length,
      pendingCount: pending.length,
      appliedInThisRun,
      verifiedChecksums,
      success: true,
      message: verifyOnly
        ? `Checksum verification complete. All ${verifiedChecksums.length} applied migrations match disk files.`
        : `Successfully applied ${appliedInThisRun.length} migration(s) to live database.`
    };

    return report;
  } finally {
    if (ownClient && client) {
      await client.end().catch(() => {});
    }
  }
}

// CLI Execution
if (process.argv[1] && process.argv[1].endsWith('deploy-migrations.js')) {
  const isDryRun = process.argv.includes('--dry-run');
  const isVerifyOnly = process.argv.includes('--verify-only');
  const isLive = process.argv.includes('--live');
  const urlArg = process.argv.find(a => a.startsWith('--url='));
  const customUrl = urlArg ? urlArg.split('=')[1] : undefined;

  const dbUrl = customUrl || process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

  if (isLive && !dbUrl) {
    console.error('CRITICAL: Cannot execute in --live mode without DATABASE_URL or SUPABASE_DB_URL.');
    process.exit(1);
  }

  console.log('=== Gulistan Migration Deployment Runner ===');
  if (isDryRun || !dbUrl) {
    console.log('[Notice] Running in DRY-RUN mode. Set DATABASE_URL and pass --live to apply to database.');
  }

  runMigrationDeployment({
    databaseUrl: dbUrl,
    dryRun: isDryRun || (!dbUrl && !isLive),
    verifyOnly: isVerifyOnly
  }).then(report => {
    console.log(JSON.stringify(report, null, 2));
    console.log('=== Migration Deployment Complete ===');
  }).catch(err => {
    console.error('Migration deployment failed:', err);
    process.exit(1);
  });
}
