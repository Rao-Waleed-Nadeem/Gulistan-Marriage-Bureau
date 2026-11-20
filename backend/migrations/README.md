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

### `00007_storage_and_share_grants_enhancements.sql`
* **Status:** Implemented under Task `T-034`.
* **Scope:**
  * Remediates independent audit findings P0-07, P0-08, P1-25, P1-26, P1-27, P1-28, and P1-29.
  * Ensures `storage` schema, `storage.buckets`, and `storage.objects` baseline exists for standard PostgreSQL and managed Supabase environments.
  * Provisions private bucket `candidate-photos` (`public = FALSE`, 5MB limit, JPEG/PNG/WebP).
  * Establishes Row-Level Security on `storage.objects`: explicitly revokes public/anon access, grants staff full management, and grants authenticated customers self-service upload, read, and delete on their own pending profile folders.
  * Enhances `public.share_grants` schema with foreign key `match_case_id UUID REFERENCES public.match_cases(id) ON DELETE SET NULL`, `disclosed_snapshot JSONB`, and index `idx_share_grants_match_case`.
  * Adds customer select policy `share_grants_customer_own_select` on `share_grants`.
  * Implements atomic transactional server RPCs (`SECURITY DEFINER`):
    - `public.create_share_grant`: issues token-hashed share grant with candidate status validation and audit trail.
    - `public.redeem_share_grant`: validates expiration, revocation, and candidate consent before returning disclosed snapshot.
    - `public.revoke_share_grant`: revokes grant immediately and records audit event.
    - `public.execute_candidate_privacy_erasure`: atomic server-side erasure deleting photo records/objects, revoking active share grants, marking consents withdrawn, and deactivating profile.
* **Rollback Procedure:**
  ```sql
  BEGIN;
  DROP FUNCTION IF EXISTS public.execute_candidate_privacy_erasure(UUID, BOOLEAN);
  DROP FUNCTION IF EXISTS public.revoke_share_grant(UUID, VARCHAR);
  DROP FUNCTION IF EXISTS public.redeem_share_grant(VARCHAR);
  DROP FUNCTION IF EXISTS public.create_share_grant(UUID, UUID, VARCHAR, VARCHAR, VARCHAR, JSONB, JSONB, TIMESTAMPTZ);
  DROP POLICY IF EXISTS share_grants_customer_own_select ON public.share_grants;
  DROP INDEX IF EXISTS idx_share_grants_match_case;
  ALTER TABLE public.share_grants DROP COLUMN IF EXISTS version;
  ALTER TABLE public.share_grants DROP COLUMN IF EXISTS disclosed_snapshot;
  ALTER TABLE public.share_grants DROP COLUMN IF EXISTS match_case_id;
  DROP POLICY IF EXISTS storage_objects_customer_own_delete ON storage.objects;
  DROP POLICY IF EXISTS storage_objects_customer_own_select ON storage.objects;
  DROP POLICY IF EXISTS storage_objects_customer_own_insert ON storage.objects;
  DROP POLICY IF EXISTS storage_objects_staff_manage ON storage.objects;
  DELETE FROM storage.buckets WHERE id = 'candidate-photos';
  COMMIT;
  ```

### `00008_match_cases_and_decisions_enhancements.sql`
* **Status:** Implemented under Task `T-035`.
* **Scope:**
  * Remediates independent audit findings P0-06, P1-20, P1-21, P1-22, P1-23, and P1-24.
  * Creates canonical profile pair unique index on `public.match_cases`:
    `CREATE UNIQUE INDEX IF NOT EXISTS uq_match_cases_canonical_pair ON public.match_cases (LEAST(profile_a_id, profile_b_id), GREATEST(profile_a_id, profile_b_id));`
  * Implements atomic transactional server RPCs (`SECURITY DEFINER`):
    - `public.get_or_create_match_case`: ensures canonical pair ordering `(LEAST, GREATEST)` server-side, verifies self-pairing prevention, and validates staff caller.
    - `public.record_match_decision`:
      * Constrains human decision authority strictly to Lead Matchmaker Nadeem (`matchmaker` role) per project rules.
      * Permits Administrator override only with explicit `admin_override = true` flag and generates an immutable `match_approval_admin_override` audit trail.
      * Enforces evaluation prerequisite: requires a latest evaluation record to exist on the match case with `mandatory_satisfied = TRUE` before `'approved'` status is accepted.
      * Executes atomic update: inserts decision into `public.match_decisions` and transitions `public.match_cases.status` to `approved_by_nadeem`, `rejected`, or `deferred` in a single ACID transaction.
  * Tightens Row-Level Security on `public.match_decisions` (`decisions_matchmaker_manage`) to restrict decision creation to matchmaker and admin roles.
* **Rollback Procedure:**
  ```sql
  BEGIN;
  DROP POLICY IF EXISTS decisions_matchmaker_manage ON public.match_decisions;
  CREATE POLICY decisions_staff_manage ON public.match_decisions
      FOR ALL TO authenticated USING (public.auth_is_staff()) WITH CHECK (public.auth_is_staff());
  DROP FUNCTION IF EXISTS public.record_match_decision(UUID, VARCHAR, VARCHAR, TEXT, UUID, BOOLEAN);
  DROP FUNCTION IF EXISTS public.get_or_create_match_case(UUID, UUID, UUID);
  DROP INDEX IF EXISTS public.uq_match_cases_canonical_pair;
  COMMIT;
  ```

### `00009_customer_portal_and_crm_enhancements.sql`
* **Status:** Implemented under Task `T-036`.
* **Scope:**
  * Remediates independent audit findings P1-16, P1-17, P1-30, P1-31, and P2-06.
  * Reminder delivery model schema enhancements on `public.crm_follow_ups`:
    - Adds `reminder_sent_at TIMESTAMPTZ NULL` and `notification_channel VARCHAR(30) NOT NULL DEFAULT 'in_app'`.
    - Check constraint `chk_followup_channel` enforcing `('in_app', 'email', 'whatsapp', 'sms')`.
    - Composite index `idx_crm_follow_ups_reminders` on `(scheduled_date, status, reminder_sent_at)`.
  * Customer self-service RLS policies on `public.crm_follow_ups`:
    - `follow_ups_customer_insert`: allows customers with active accounts to submit requests (`profile_correction`, `deactivation_request`, `photo_consent_change`, `customer_inquiry`) on their owned profiles.
    - `follow_ups_customer_select`: allows customers to view their own submitted requests.
  * Customer preference update RLS policy `prefs_customer_own_update` on `public.profile_preferences` permitting preference updates for profiles in `pending_review`, `active`, or `introduction_authorized` status.
  * Server RPC `public.update_profile_preferences(p_profile_id UUID, p_preferences JSONB)`:
    - Atomically upserts preferences with owner/staff authorization check.
    - Generates minimal audit record `profile_preferences_updated`.
  * Server RPC `public.get_customer_recommendations(p_profile_id UUID)`:
    - Provides authorized customer portal recommendation queries bound to caller ownership.
    - Only returns match cases with status `approved_by_nadeem`, `shared_with_parties`, or `accepted_by_customer`.
    - Projects privacy-filtered candidate info (display pseudonym, age, education, city, etc.) and strictly excludes sensitive direct contact details.
* **Rollback Procedure:**
  ```sql
  BEGIN;
  DROP FUNCTION IF EXISTS public.get_customer_recommendations(UUID);
  DROP FUNCTION IF EXISTS public.update_profile_preferences(UUID, JSONB);
  DROP POLICY IF EXISTS prefs_customer_own_update ON public.profile_preferences;
  DROP POLICY IF EXISTS follow_ups_customer_select ON public.crm_follow_ups;
  DROP POLICY IF EXISTS follow_ups_customer_insert ON public.crm_follow_ups;
  DROP INDEX IF EXISTS public.idx_crm_follow_ups_reminders;
  ALTER TABLE public.crm_follow_ups DROP CONSTRAINT IF EXISTS chk_followup_channel;
  ALTER TABLE public.crm_follow_ups DROP COLUMN IF EXISTS notification_channel;
  ALTER TABLE public.crm_follow_ups DROP COLUMN IF EXISTS reminder_sent_at;
  COMMIT;
  ```

### `00010_matchmaker_and_finance_enhancements.sql`
* **Status:** Implemented under Task `T-037`.
* **Scope:**
  * Remediates independent audit findings P1-32, P1-33, P1-34, P1-35, P1-36, P1-37, and P1-38.
  * Partner Agreements Tiered Model Schema:
    - Adds `tiered_rules JSONB NULL` to `public.matchmaker_agreements` for progressive commission agreements.
  * Referral Attributions Durable Schema:
    - Creates table `public.referral_attributions` with foreign keys to `external_matchmakers(id)` and `profiles(id)`.
    - Unique constraint `uq_referral_partner_profile` on `(matchmaker_id, profile_id)` enforcing attribution idempotency and preventing duplicate referral attribution.
    - Enables RLS with staff policies: `referral_attributions_staff_select` and `referral_attributions_staff_insert`.
  * Atomic Referral Attribution Server RPC `public.attribute_profile_referral(p_matchmaker_id UUID, p_profile_id UUID, p_notes TEXT, p_attributed_by UUID)`:
    - Validates caller staff status, active partner status, and candidate profile existence.
    - Atomically records attribution in `referral_attributions` and deterministically recalculates `external_matchmakers.referral_count` without concurrency race conditions.
    - Appends minimal audit event `profile_referral_attributed`.
  * Financial Reversal Partial Unique Index:
    - `uq_financial_transactions_reversal` on `public.financial_transactions (reversal_of) WHERE reversal_of IS NOT NULL` enforcing single reversal at the database level.
  * Transaction Type & Status Integrity:
    - Check constraint `chk_financial_tx_reversal_status` ensuring reversals must have `status = 'settled'` and non-null `reversal_of`.
  * Atomic Financial Reversal Server RPC `public.record_financial_reversal(p_original_id UUID, p_reason TEXT, p_recorded_by UUID)`:
    - Acquires row lock `FOR UPDATE` on target transaction.
    - Validates original existence, verifies transaction is not a reversal, and ensures it has not already been reversed.
    - Updates original transaction `status = 'reversed'` and inserts new reversal transaction row with `status = 'settled'`.
    - Appends minimal audit event `financial_transaction_reversed`.
* **Rollback Procedure:**
  ```sql
  BEGIN;
  DROP FUNCTION IF EXISTS public.record_financial_reversal(UUID, TEXT, UUID);
  ALTER TABLE public.financial_transactions DROP CONSTRAINT IF EXISTS chk_financial_tx_reversal_status;
  DROP INDEX IF EXISTS public.uq_financial_transactions_reversal;
  DROP FUNCTION IF EXISTS public.attribute_profile_referral(UUID, UUID, TEXT, UUID);
  DROP TABLE IF EXISTS public.referral_attributions CASCADE;
  ALTER TABLE public.matchmaker_agreements DROP COLUMN IF EXISTS tiered_rules;
  COMMIT;
  ```

### `00011_durable_migration_batches_and_reconciliation.sql`
* **Status:** Implemented under Task `T-038`.
* **Scope:**
  * Remediates independent audit findings P1-39, P1-40, P1-41, P1-42, P1-43, P1-44, P1-45, P1-46, and P1-47.
  * Durable Batch Schema Enhancements on `public.migration_batches`:
    - Adds `reconciled_at TIMESTAMPTZ NULL`, `rolled_back_at TIMESTAMPTZ NULL`, and `rollback_reason TEXT NULL`.
  * Staged Record Privacy and Rollback Enhancements on `public.migration_staged_records`:
    - Relaxes `raw_content` to `NULL` to enable sensitive raw content purging while retaining SHA-256 provenance hashes.
    - Adds `is_raw_purged BOOLEAN NOT NULL DEFAULT FALSE` and `raw_content_hash VARCHAR(64) NULL`.
    - Updates check constraint `chk_migration_record_status` to support `'rolled_back'`.
  * Atomic Batch Import Server RPC `public.import_migration_batch(p_batch_id UUID, p_actor_id UUID)`:
    - Acquires `FOR UPDATE` row lock on batch, enforces affirmative owner approval check (`approved_by_owner`), and validates staff authorization.
    - Supports conflict merge updates (`merge_update`) on existing profiles without duplicate profile generation.
    - Strictly checks mandatory profile invariants (`fullName`, `contactPhone`, `gender`, `age`, `maritalStatus`, `religion`, `aqeedah`, `caste`, `education`, `occupation`, `currentCity`) and quarantines invalid records with `DATA_VALIDATION_ERROR` rather than manufacturing demographic facts.
    - Inserts new candidate profiles with reference codes, sets staged status to `imported`, updates batch imported and quarantined counts, and transitions batch status to `completed` in a single transaction.
  * Durable Rollback Server RPC `public.rollback_migration_batch(p_batch_id UUID, p_reason TEXT, p_actor_id UUID)`:
    - Transitions imported candidate profiles from the batch to `restricted` status and deactivates associated photo records.
    - Transitions staged records from `'imported'` to `'rolled_back'`.
    - Records batch `rolled_back_at` timestamp, rollback reason, transitions batch status to `'rolled_back'`, and writes an audit event `migration_batch_rolled_back`.
  * Raw Content Minimization & Purge Server RPC `public.purge_staged_raw_content(p_batch_id UUID, p_actor_id UUID)`:
    - Minimizes raw conversation text containing third-party PII by computing/verifying SHA-256 hash, setting `raw_content = NULL`, and marking `is_raw_purged = TRUE`.
    - Appends audit event `migration_raw_content_purged`.
* **Rollback Procedure:**
  ```sql
  BEGIN;
  DROP FUNCTION IF EXISTS public.purge_staged_raw_content(UUID, UUID);
  DROP FUNCTION IF EXISTS public.rollback_migration_batch(UUID, TEXT, UUID);
  DROP FUNCTION IF EXISTS public.import_migration_batch(UUID, UUID);
  ALTER TABLE public.migration_staged_records DROP CONSTRAINT IF EXISTS chk_migration_record_status;
  ALTER TABLE public.migration_staged_records ADD CONSTRAINT chk_migration_record_status
      CHECK (status IN ('staged', 'validated', 'quarantined', 'imported', 'skipped'));
  ALTER TABLE public.migration_staged_records DROP COLUMN IF EXISTS raw_content_hash;
  ALTER TABLE public.migration_staged_records DROP COLUMN IF EXISTS is_raw_purged;
  ALTER TABLE public.migration_staged_records ALTER COLUMN raw_content SET NOT NULL;
  ALTER TABLE public.migration_batches DROP COLUMN IF EXISTS rollback_reason;
  ALTER TABLE public.migration_batches DROP COLUMN IF EXISTS rolled_back_at;
  ALTER TABLE public.migration_batches DROP COLUMN IF EXISTS reconciled_at;
  COMMIT;
  ```






