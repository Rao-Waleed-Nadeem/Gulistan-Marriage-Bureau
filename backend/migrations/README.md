# Database Migrations — Gulistan Marriage Bureau

This directory is the authoritative source of truth for database schema definitions, access control policies, foreign key relationships, and indexes.

---

## 1. File Naming Convention

Migrations must follow a strict 5-digit sequential prefix followed by a concise snake_case description:

```text
backend/migrations/
├── 00001_initial_schema_baseline.sql
├── 00002_add_candidate_siblings.sql
└── ...
```

* **Sequential Numbering:** Migration numbers must strictly increment without gaps (`00001`, `00002`, `00003`, etc.).
* **Zero Padding:** Numbers must be 5 digits with leading zeros.
* **Extension:** Must end in `.sql`.

---

## 2. Mandatory Migration Safety Invariants

Before any migration is committed to `main`:

1. **Transaction Safety:** Wrap all DDL statements in a transaction block unless specifically forbidden by PostgreSQL (e.g., `CREATE INDEX CONCURRENTLY`):
   ```sql
   BEGIN;
   -- Schema definitions and policy statements
   COMMIT;
   ```
2. **Row-Level Security (RLS) Baseline:** Every newly created public table must immediately enable RLS:
   ```sql
   ALTER TABLE public.table_name ENABLE ROW LEVEL SECURITY;
   ```
3. **Least Privilege Grants:** Explicitly grant only required permissions to `anon`, `authenticated`, or `service_role`. Never grant unrestricted write access to `anon` or `public`.
4. **No Destructive Operations Without Safeguards:**
   * Raw `DROP DATABASE` is strictly forbidden.
   * `DROP TABLE` or `DROP COLUMN` must include `IF EXISTS` and requires explicit documented data migration procedures.
5. **No Production Data Seeding in Schema Migrations:**
   * Schema migrations must contain structure, constraints, indexes, triggers, and RLS policies only.
   * Mock test data must not be seeded into authoritative migrations.

---

## 3. Migration Tooling & Deployment Runner

Validate and deploy your migrations locally or to live staging using the backend scripts:

```bash
# Validate naming, sequence, and SQL safety checks across all migration files:
npm run migrate:validate

# Inspect migration status (offline disk inspection or live database when DATABASE_URL is set):
npm run migrate:status

# Validate migration plan and checksums in simulation/dry-run mode (no DB changes):
npm run deploy:migrations -- --dry-run

# Verify checksums of applied migrations against live database without applying pending:
npm run deploy:migrations:verify

# Execute pending migrations transactionally against live PostgreSQL database:
npm run deploy:migrations:live
# (Requires DATABASE_URL or SUPABASE_DB_URL configured in backend environment)
```

### Schema Migrations Tracking Table (`public.schema_migrations`)

Live deployments maintain a durable migration history in the PostgreSQL database:
```sql
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  version VARCHAR(20) PRIMARY KEY,
  name TEXT NOT NULL,
  checksum VARCHAR(64) NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  execution_time_ms INTEGER NOT NULL DEFAULT 0,
  applied_by TEXT DEFAULT CURRENT_USER
);
```

Before applying pending migrations, the runner verifies that every already-applied migration's recorded SHA-256 checksum exactly matches the disk file. Tampered or modified migration files trigger an immediate abort to protect database integrity. Each pending migration is applied inside its SQL transaction block, and the execution time and checksum are persisted upon completion.


---

## 4. Migration Catalog & Recovery Limits

### `00001_initial_schema_baseline.sql`
* **Status:** Implemented under Task `T-004`.
* **Scope:**
  * App roles enum (`admin`, `matchmaker`, `customer`) and `user_roles` table.
  * Security definer helper functions (`auth_has_role()`, `auth_is_staff()`).
  * Core candidate profiles table (`profiles`) with constraints (age 18–100, height 48–96 inches, status, non-negative income, unique reference code).
  * Candidate consents table (`candidate_consents`) capturing submitter relation and consent types per OPEN-004.
  * Append-only audit trail (`audit_events`) with strict omission of UPDATE and DELETE policies.
  * RLS enabled across all 4 tables with public/anon revocation and least-privilege authenticated grants.
* **Replay Capability:** Replays cleanly on clean PostgreSQL 15/16 or Supabase environments.
* **Rollback Procedure:** For development rollback before data population:
  ```sql
  BEGIN;
  DROP TABLE IF EXISTS public.audit_events CASCADE;
  DROP TABLE IF EXISTS public.candidate_consents CASCADE;
  DROP TABLE IF EXISTS public.profiles CASCADE;
  DROP TABLE IF EXISTS public.user_roles CASCADE;
  DROP FUNCTION IF EXISTS public.auth_is_staff();
  DROP FUNCTION IF EXISTS public.auth_has_role(public.app_role);
  DROP TYPE IF EXISTS public.app_role CASCADE;
  COMMIT;
  ```
* **Recovery Limits & SLA:**
  * Free tier in development does not offer Point-In-Time Recovery (PITR).
  * Upgrading to Supabase Pro at production launch ($25/mo per DECIDED: OPEN-013) unlocks 7-day PITR and automated physical backups.
  * Audit events are append-only to preserve legal evidentiary value under Pakistan data protection baselines.

### `00005_auth_lifecycle_ownership_and_audit.sql`
* **Status:** Implemented under Task `T-032`.
* **Scope:**
  * Customer profile ownership binding via `profiles.account_id UUID` linking profiles to `auth.users(id)` with index.
  * Customer self-service intake policy (`profiles_customer_insert`) strictly requiring `account_id = auth.uid()`, `source = 'direct_web'`, and `status = 'pending_review'`.
  * Consent schema remediation: drops forced check constraint `chk_profiles_consent_certified`, drops unverified `TRUE` defaults on `candidate_consents`, and adds explicit `status` column check constraint (`granted`, `withdrawn`, `pending`, `expired`).
  * Database-enforced profile lifecycle state machine trigger `trg_profile_status_lifecycle` and function `validate_profile_status_transition()` enforcing the 6-state taxonomy transitions and automatically recording auditable transitions in `profile_status_history`.
  * Account status enforcement in RLS via `auth_is_account_active()` rejecting `suspended` and `pending_verification` accounts.
  * Audit trail security: recreates `audit_events_insert` requiring `actor_id = auth.uid()` and provides trusted server RPC `record_audit_event()`.
* **Rollback Procedure:**
  ```sql
  BEGIN;
  DROP TRIGGER IF EXISTS trg_profile_status_lifecycle ON public.profiles;
  DROP FUNCTION IF EXISTS public.validate_profile_status_transition();
  DROP FUNCTION IF EXISTS public.record_audit_event(VARCHAR, VARCHAR, VARCHAR, TEXT);
  DROP FUNCTION IF EXISTS public.auth_is_account_active(UUID);
  DROP POLICY IF EXISTS profiles_customer_insert ON public.profiles;
  DROP POLICY IF EXISTS profiles_customer_update ON public.profiles;
  DROP INDEX IF EXISTS idx_profiles_account_id;
  ALTER TABLE public.profiles DROP COLUMN IF EXISTS account_id;
  COMMIT;
  ```

### `00006_profile_intake_and_ownership_enhancements.sql`
* **Status:** Implemented under Task `T-033`.
* **Scope:**
  * Remediates independent audit findings P0-03, P0-15, P1-10, P1-11, P1-12, P1-13, and P1-14.
  * Adds customer child table RLS policies on `profile_preferences`, `profile_siblings`, and `profile_property_details` permitting `SELECT`, `INSERT`, and `UPDATE` for authenticated owners (`account_id = auth.uid()` or `created_by = auth.uid()`) while in `pending_review` and active account status.
  * Defines atomic transactional intake PL/pgSQL function `create_profile_bundle` (`SECURITY DEFINER`) ensuring parent profile, preferences, property, and repeating siblings commit or roll back together atomically.
  * Enforces customer self-service constraints inside RPC: active account verification, forced `status = 'pending_review'`, `source = 'direct_web'`, `account_id = auth.uid()`, and validation of candidate demographics.
  * Fully preserves child entities (preferences with all bounds, sibling education/marital details, property details without default fabrication).
* **Rollback Procedure:**
  ```sql
  BEGIN;
  DROP FUNCTION IF EXISTS public.create_profile_bundle(JSONB);
  DROP POLICY IF EXISTS property_customer_own_update ON public.profile_property_details;
  DROP POLICY IF EXISTS property_customer_own_insert ON public.profile_property_details;
  DROP POLICY IF EXISTS property_customer_own_select ON public.profile_property_details;
  DROP POLICY IF EXISTS siblings_customer_own_update ON public.profile_siblings;
  DROP POLICY IF EXISTS siblings_customer_own_insert ON public.profile_siblings;
  DROP POLICY IF EXISTS siblings_customer_own_select ON public.profile_siblings;
  DROP POLICY IF EXISTS prefs_customer_own_update ON public.profile_preferences;
  DROP POLICY IF EXISTS prefs_customer_own_insert ON public.profile_preferences;
  DROP POLICY IF EXISTS prefs_customer_own_select ON public.profile_preferences;
  COMMIT;
  ```

