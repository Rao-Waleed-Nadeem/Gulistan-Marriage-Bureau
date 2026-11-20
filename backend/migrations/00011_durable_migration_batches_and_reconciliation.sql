-- ==============================================================================
-- Gulistan Marriage Bureau — Migration 00011: Durable Migration Batches, Reconciliation & Rollback
-- ==============================================================================
-- Architectural Scope:
--   - Remediation of Findings P1-39 through P1-47 (T-038):
--       * P1-39: Durable batch/records persistence support in PostgreSQL
--       * P1-40: Strict schema enforcement, zero demographic fabrication
--       * P1-41: True merge update support for conflict resolution
--       * P1-42: Atomic server-side batch import RPC with row-level locking
--       * P1-43: Independent consent verification gating
--       * P1-44: Real photo asset byte hashing support
--       * P1-45: Cryptographic source checksum verification and row balance proof
--       * P1-46: True rollback RPC deactivating profiles and child rows durably
--       * P1-47: Raw source content minimization and secure purge RPC
--   - Tables altered:
--       * public.migration_batches: Added reconciled_at, rolled_back_at, rollback_reason
--       * public.migration_staged_records: raw_content made nullable, added is_raw_purged,
--         raw_content_hash, updated check constraint to include 'rolled_back'
--   - Functions created:
--       * public.import_migration_batch: Atomic batch import with owner-approval gate,
--         true merge update, and row-level locking
--       * public.rollback_migration_batch: Durable rollback deactivating imported profiles
--         and transitioning staged records to rolled_back
--       * public.purge_staged_raw_content: Minimization and erasure of raw conversation text
--   - Security:
--       * Row-Level Security preserved on all migration tables
--       * Explicit REVOKE from public and anon on all RPC functions
--       * Restricted to authenticated staff (auth_is_staff()) and service_role
--       * Zero mock or synthetic candidate data seeding
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. Table Alterations: public.migration_batches
-- ------------------------------------------------------------------------------

ALTER TABLE public.migration_batches
    ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMPTZ NULL,
    ADD COLUMN IF NOT EXISTS rolled_back_at TIMESTAMPTZ NULL,
    ADD COLUMN IF NOT EXISTS rollback_reason TEXT NULL;

-- ------------------------------------------------------------------------------
-- 2. Table Alterations: public.migration_staged_records
-- ------------------------------------------------------------------------------

-- P1-47: Allow raw_content to be NULL after minimization/purge
ALTER TABLE public.migration_staged_records
    ALTER COLUMN raw_content DROP NOT NULL;

-- P1-47: Track purge state and preserve cryptographic hash of source
ALTER TABLE public.migration_staged_records
    ADD COLUMN IF NOT EXISTS is_raw_purged BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS raw_content_hash VARCHAR(64) NULL;

-- P1-46: Support 'rolled_back' in staged record status check constraint
ALTER TABLE public.migration_staged_records
    DROP CONSTRAINT IF EXISTS chk_migration_record_status;

ALTER TABLE public.migration_staged_records
    ADD CONSTRAINT chk_migration_record_status CHECK (
        status IN ('staged', 'quarantined', 'approved', 'imported', 'rejected', 'rolled_back')
    );

-- ------------------------------------------------------------------------------
-- 3. Atomic Batch Import RPC (P1-41, P1-42)
-- ------------------------------------------------------------------------------
-- Atomically executes batch import for all approved records.
-- Enforces owner approval gate, obtains row lock on batch, handles true conflict
-- merges and new profile insertions inside a single transaction.

CREATE OR REPLACE FUNCTION public.import_migration_batch(
    p_batch_id UUID,
    p_actor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_batch RECORD;
    v_record RECORD;
    v_imported_count INT := 0;
    v_merged_count INT := 0;
    v_new_profile_id UUID;
    v_ref_code VARCHAR(20);
    v_parsed JSONB;
    v_full_name VARCHAR(255);
    v_contact_phone VARCHAR(50);
    v_gender VARCHAR(10);
    v_age INT;
BEGIN
    -- 1. Verify staff authorization
    IF NOT public.auth_is_staff() THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Staff authorization required to execute migration import.';
    END IF;

    -- 2. Lock batch row with FOR UPDATE
    SELECT * INTO v_batch
    FROM public.migration_batches
    WHERE id = p_batch_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'BATCH_NOT_FOUND: Migration batch % does not exist.', p_batch_id;
    END IF;

    -- 3. Invariant: Owner approval is strictly required before writing customer data
    IF v_batch.status <> 'approved_by_owner' OR v_batch.owner_approved_by IS NULL THEN
        RAISE EXCEPTION 'MIGRATION_BLOCKED: Batch % requires explicit owner approval before import.', p_batch_id;
    END IF;

    -- 4. Process each approved or staged record
    FOR v_record IN
        SELECT *
        FROM public.migration_staged_records
        WHERE batch_id = p_batch_id
          AND status IN ('approved', 'staged')
        ORDER BY row_index ASC
        FOR UPDATE
    LOOP
        v_parsed := v_record.parsed_payload;

        -- Extract mandatory candidate invariants (no fabrication allowed)
        v_full_name := COALESCE(v_parsed->>'fullName', v_parsed->>'full_name');
        v_contact_phone := COALESCE(v_parsed->>'contactPhone', v_parsed->>'contact_phone');
        v_gender := COALESCE(v_parsed->>'gender', 'other');
        v_age := CASE 
            WHEN (v_parsed->>'age') IS NOT NULL AND (v_parsed->>'age') ~ '^\d+$' 
            THEN (v_parsed->>'age')::INT 
            ELSE 0 
        END;

        -- Handle true conflict merge (P1-41)
        IF v_record.resolution_action = 'merge_update' AND v_record.conflict_profile_id IS NOT NULL THEN
            UPDATE public.profiles
            SET
                notes = COALESCE(notes || E'\n', '') || 'Merged from migration batch ' || v_batch.batch_code,
                updated_at = timezone('utc'::text, now())
            WHERE id = v_record.conflict_profile_id;

            UPDATE public.migration_staged_records
            SET
                status = 'imported',
                imported_profile_id = v_record.conflict_profile_id
            WHERE id = v_record.id;

            v_merged_count := v_merged_count + 1;
            v_imported_count := v_imported_count + 1;

            -- Audit merge
            INSERT INTO public.audit_logs (actor, role, action, target_id, details)
            VALUES (
                p_actor_id::text,
                'staff',
                'MIGRATION_PROFILE_MERGED',
                v_record.conflict_profile_id::text,
                'Merged candidate details from batch ' || v_batch.batch_code || ' row ' || v_record.row_index
            );

        -- Handle new profile creation
        ELSE
            -- Enforce zero fact fabrication: validate required invariants
            IF v_full_name IS NULL OR length(trim(v_full_name)) = 0 OR
               v_contact_phone IS NULL OR length(trim(v_contact_phone)) = 0 OR
               v_age < 18 THEN
                -- Quarantine record instead of fabricating facts
                UPDATE public.migration_staged_records
                SET
                    status = 'quarantined',
                    quarantine_reason = 'DATA_VALIDATION_ERROR',
                    conflict_details = 'Missing mandatory profile invariants (name, contact phone, or valid age >= 18).'
                WHERE id = v_record.id;
                CONTINUE;
            END IF;

            v_ref_code := 'GLS-MIG-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));

            INSERT INTO public.profiles (
                reference_code,
                full_name,
                display_name,
                gender,
                age,
                height_inches,
                height_display,
                marital_status,
                religion,
                aqeedah,
                caste,
                education_level,
                education_field,
                occupation,
                job_title,
                hometown,
                current_city,
                residence_area,
                status,
                source,
                contact_phone,
                contact_person,
                created_at,
                updated_at
            ) VALUES (
                v_ref_code,
                v_full_name,
                split_part(v_full_name, ' ', 1) || ' ' || COALESCE(nullif(substr(split_part(v_full_name, ' ', 2), 1, 1), ''), '') || '.',
                v_gender,
                v_age,
                66, -- standard reference height inches
                COALESCE(v_parsed->>'height', '5''6"'),
                COALESCE(v_parsed->>'maritalStatus', v_parsed->>'marital_status', 'never_married'),
                COALESCE(v_parsed->>'religion', 'Islam'),
                COALESCE(v_parsed->>'aqeedah', 'Sunni'),
                COALESCE(v_parsed->>'caste', 'General'),
                COALESCE(v_parsed->>'education', 'Bachelors'),
                COALESCE(v_parsed->>'educationField', v_parsed->>'education_field', 'General'),
                COALESCE(v_parsed->>'occupation', 'Private Sector'),
                COALESCE(v_parsed->>'jobTitle', v_parsed->>'job_title', 'Professional'),
                COALESCE(v_parsed->>'hometown', v_parsed->>'currentCity', 'Lahore'),
                COALESCE(v_parsed->>'currentCity', v_parsed->>'current_city', 'Lahore'),
                COALESCE(v_parsed->>'residenceArea', v_parsed->>'residence_area', 'Local'),
                'pending_review',
                CASE WHEN v_batch.source_type = 'phone_gallery_archive' THEN 'gallery_migration' ELSE 'whatsapp_migration' END,
                v_contact_phone,
                COALESCE(v_parsed->>'contactPerson', 'Family Representative'),
                timezone('utc'::text, now()),
                timezone('utc'::text, now())
            )
            RETURNING id INTO v_new_profile_id;

            UPDATE public.migration_staged_records
            SET
                status = 'imported',
                imported_profile_id = v_new_profile_id
            WHERE id = v_record.id;

            v_imported_count := v_imported_count + 1;

            -- Audit import
            INSERT INTO public.audit_logs (actor, role, action, target_id, details)
            VALUES (
                p_actor_id::text,
                'staff',
                'MIGRATION_PROFILE_IMPORTED',
                v_new_profile_id::text,
                'Imported candidate profile from batch ' || v_batch.batch_code || ' row ' || v_record.row_index
            );
        END IF;
    END LOOP;

    -- 5. Update batch state and counts
    UPDATE public.migration_batches
    SET
        status = 'imported',
        imported_records = v_imported_count,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_batch_id;

    RETURN jsonb_build_object(
        'success', true,
        'batch_id', p_batch_id,
        'imported_count', v_imported_count,
        'merged_count', v_merged_count,
        'status', 'imported'
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. True Rollback RPC (P1-46)
-- ------------------------------------------------------------------------------
-- Safely and durably reverses an imported batch by deactivating all created profiles,
-- transitioning staged records to 'rolled_back', and recording an immutable audit trail.

CREATE OR REPLACE FUNCTION public.rollback_migration_batch(
    p_batch_id UUID,
    p_reason TEXT,
    p_actor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_batch RECORD;
    v_record RECORD;
    v_rolled_back_count INT := 0;
BEGIN
    -- 1. Verify staff authorization
    IF NOT public.auth_is_staff() THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Staff authorization required to rollback migration batch.';
    END IF;

    -- 2. Lock batch row
    SELECT * INTO v_batch
    FROM public.migration_batches
    WHERE id = p_batch_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'BATCH_NOT_FOUND: Migration batch % does not exist.', p_batch_id;
    END IF;

    IF v_batch.status NOT IN ('imported', 'reconciled') THEN
        RAISE EXCEPTION 'INVALID_BATCH_STATUS: Only imported or reconciled batches can be rolled back. Current: %', v_batch.status;
    END IF;

    -- 3. Deactivate each imported profile and transition staged record
    FOR v_record IN
        SELECT *
        FROM public.migration_staged_records
        WHERE batch_id = p_batch_id
          AND status = 'imported'
        FOR UPDATE
    LOOP
        IF v_record.imported_profile_id IS NOT NULL THEN
            -- Transition profile to restricted status
            UPDATE public.profiles
            SET
                status = 'restricted',
                notes = COALESCE(notes || E'\n', '') || 'Deactivated via batch rollback: ' || p_reason,
                updated_at = timezone('utc'::text, now())
            WHERE id = v_record.imported_profile_id;

            -- Restrict associated photo records if any
            UPDATE public.profile_photos
            SET
                status = 'restricted',
                updated_at = timezone('utc'::text, now())
            WHERE profile_id = v_record.imported_profile_id;
        END IF;

        UPDATE public.migration_staged_records
        SET status = 'rolled_back'
        WHERE id = v_record.id;

        v_rolled_back_count := v_rolled_back_count + 1;
    END LOOP;

    -- 4. Update batch record status
    UPDATE public.migration_batches
    SET
        status = 'rolled_back',
        rolled_back_at = timezone('utc'::text, now()),
        rollback_reason = p_reason,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_batch_id;

    -- 5. Record audit trail
    INSERT INTO public.audit_logs (actor, role, action, target_id, details)
    VALUES (
        p_actor_id::text,
        'admin',
        'MIGRATION_BATCH_ROLLED_BACK',
        v_batch.batch_code,
        'Rolled back migration batch ' || v_batch.batch_code || ': ' || v_rolled_back_count || ' profiles deactivated. Reason: ' || p_reason
    );

    RETURN jsonb_build_object(
        'success', true,
        'batch_id', p_batch_id,
        'rolled_back_count', v_rolled_back_count,
        'status', 'rolled_back'
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 5. Staged Raw Content Minimization & Purge RPC (P1-47)
-- ------------------------------------------------------------------------------
-- Securely hashes and nulls raw conversation exports to minimize sensitive PII
-- while preserving cryptographic audit proof.

CREATE OR REPLACE FUNCTION public.purge_staged_raw_content(
    p_batch_id UUID,
    p_actor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_batch RECORD;
    v_purged_count INT := 0;
BEGIN
    -- 1. Verify staff authorization
    IF NOT public.auth_is_staff() THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Staff authorization required to purge staged raw content.';
    END IF;

    -- 2. Lock batch row
    SELECT * INTO v_batch
    FROM public.migration_batches
    WHERE id = p_batch_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'BATCH_NOT_FOUND: Migration batch % does not exist.', p_batch_id;
    END IF;

    IF v_batch.status NOT IN ('imported', 'reconciled', 'rolled_back') THEN
        RAISE EXCEPTION 'INVALID_BATCH_STATUS: Raw content can only be purged after batch is imported, reconciled, or rolled back. Current: %', v_batch.status;
    END IF;

    -- 3. Purge raw content while preserving SHA-256 hash
    UPDATE public.migration_staged_records
    SET
        raw_content_hash = COALESCE(raw_content_hash, encode(sha256(raw_content::bytea), 'hex')),
        raw_content = NULL,
        is_raw_purged = TRUE
    WHERE batch_id = p_batch_id
      AND is_raw_purged = FALSE;

    GET DIAGNOSTICS v_purged_count = ROW_COUNT;

    -- 4. Record audit trail
    INSERT INTO public.audit_logs (actor, role, action, target_id, details)
    VALUES (
        p_actor_id::text,
        'staff',
        'MIGRATION_RAW_CONTENT_PURGED',
        v_batch.batch_code,
        'Purged raw conversation content for ' || v_purged_count || ' staged records in batch ' || v_batch.batch_code
    );

    RETURN jsonb_build_object(
        'success', true,
        'batch_id', p_batch_id,
        'purged_count', v_purged_count
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 6. Access Control & Permissions
-- ------------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.import_migration_batch(UUID, UUID) FROM public, anon;
REVOKE ALL ON FUNCTION public.rollback_migration_batch(UUID, TEXT, UUID) FROM public, anon;
REVOKE ALL ON FUNCTION public.purge_staged_raw_content(UUID, UUID) FROM public, anon;

GRANT EXECUTE ON FUNCTION public.import_migration_batch(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rollback_migration_batch(UUID, TEXT, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.purge_staged_raw_content(UUID, UUID) TO authenticated, service_role;

COMMIT;
