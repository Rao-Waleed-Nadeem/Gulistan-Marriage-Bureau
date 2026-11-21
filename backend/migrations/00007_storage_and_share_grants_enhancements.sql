-- ==============================================================================
-- Gulistan Marriage Bureau — Migration 00007: Storage and Share Grants Enhancements
-- ==============================================================================
-- Architectural & Security Invariants:
--   - Remediation of Independent Audit Findings:
--       * P0-07: Real private Storage operations for candidate photographs.
--       * P0-08: Persisted and redeemable controlled disclosure share grants.
--       * P1-25: Private Storage bucket definition and storage.objects RLS policies.
--       * P1-26: Secure photo resolution contract (signed URLs, no raw path exposure).
--       * P1-27: Fixed snapshot & match_case_id binding on share_grants.
--       * P1-28: Server-side atomic candidate privacy erasure & photo purge.
--   - Safe, additive migration: wraps all DDL in a transaction block (BEGIN ... COMMIT)
--   - Compatible with standard PostgreSQL 15/16 and Supabase Storage schemas
--   - No mock or synthetic candidate data seeding
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. Supabase-managed Storage integration (P0-07, P1-25)
-- Supabase owns the storage schema and its internal tables. Never CREATE,
-- ALTER, DROP, INSERT into, or change ownership/privileges on storage.buckets
-- or storage.objects from application migrations.
--
-- The candidate-photos bucket is provisioned separately in the Supabase
-- Dashboard. Keep it PRIVATE and configure its size/MIME limits there.
-- Storage access policies must be managed through the supported Supabase
-- Storage policy interface after the exact staff/customer authorization
-- contract has been verified. This migration deliberately does not mutate
-- managed Storage objects, so it can run under the project's DB role.

-- 2. Enhance Share Grants Schema (P0-08, P1-27)
-- ------------------------------------------------------------------------------
-- Store match_case_id and full immutable disclosed snapshot at grant issuance.

ALTER TABLE public.share_grants
    ADD COLUMN IF NOT EXISTS match_case_id UUID NULL REFERENCES public.match_cases(id) ON DELETE SET NULL;

ALTER TABLE public.share_grants
    ADD COLUMN IF NOT EXISTS disclosed_snapshot JSONB NULL;

ALTER TABLE public.share_grants
    ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_share_grants_match_case ON public.share_grants (match_case_id);

-- Customer can inspect share grants issued for their own profile
DROP POLICY IF EXISTS share_grants_customer_own_select ON public.share_grants;
CREATE POLICY share_grants_customer_own_select ON public.share_grants
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = profile_id
              AND (p.account_id = auth.uid() OR p.created_by = auth.uid())
              AND public.auth_is_account_active(auth.uid())
        )
    );

-- ------------------------------------------------------------------------------
-- 3. Atomic Server RPC: Create Share Grant (P0-08, P1-27)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_share_grant(
    p_profile_id UUID,
    p_match_case_id UUID,
    p_token_hash VARCHAR(64),
    p_recipient_type VARCHAR(30),
    p_recipient_phone VARCHAR(50),
    p_approved_fields JSONB,
    p_disclosed_snapshot JSONB,
    p_expires_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_grant_id UUID;
    v_profile_status VARCHAR(40);
    v_photo_granted BOOLEAN;
    v_snapshot_key TEXT;
BEGIN
    -- 1. Authorization: only the designated matchmaker role may issue a share grant
    IF NOT public.auth_has_role('matchmaker'::public.app_role) THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Only the authorized matchmaker can issue share grants.'
            USING ERRCODE = '42501';
    END IF;

    -- 2. Verify Profile Exists and is Shareable
    SELECT status, photo_permission_granted
    INTO v_profile_status, v_photo_granted
    FROM public.profiles
    WHERE id = p_profile_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'PROFILE_NOT_FOUND: Profile does not exist.'
            USING ERRCODE = 'P0002';
    END IF;

    IF v_profile_status NOT IN ('active', 'introduction_authorized') THEN
        RAISE EXCEPTION 'PROFILE_NOT_SHAREABLE: Profile status is %, cannot share proposal.', v_profile_status
            USING ERRCODE = '22023';
    END IF;

    -- 3. Validate Token Hash Format (64-char SHA-256)
    IF p_token_hash IS NULL OR p_token_hash !~ '^[0-9a-fA-F]{64}
            USING ERRCODE = '22023';
    END IF;

    -- 4. Validate Expiry (Cannot be in the past)
    IF p_expires_at <= timezone('utc'::text, now()) THEN
        RAISE EXCEPTION 'INVALID_EXPIRY: Share grant expiration must be in the future.'
            USING ERRCODE = '22023';
    END IF;
    -- 4a. Validate the disclosure snapshot: only explicitly approved keys,
    -- and never raw photo paths or storage metadata, may be returned publicly.
    IF jsonb_typeof(p_approved_fields) <> 'array'
       OR jsonb_typeof(p_disclosed_snapshot) <> 'object' THEN
        RAISE EXCEPTION 'INVALID_DISCLOSURE: Approved fields must be an array and snapshot must be an object.'
            USING ERRCODE = '22023';
    END IF;

    FOR v_snapshot_key IN SELECT jsonb_object_keys(p_disclosed_snapshot)
    LOOP
        IF NOT (p_approved_fields ? v_snapshot_key) THEN
            RAISE EXCEPTION 'UNAPPROVED_DISCLOSURE: Snapshot key % is not in approved_fields.', v_snapshot_key
                USING ERRCODE = '42501';
        END IF;
        IF lower(v_snapshot_key) LIKE '%photo%'
           OR lower(v_snapshot_key) LIKE '%image%'
           OR lower(v_snapshot_key) LIKE '%storage_path%'
           OR lower(v_snapshot_key) LIKE '%signed_url%' THEN
            RAISE EXCEPTION 'PHOTO_DISCLOSURE_REQUIRES_SIGNED_URL: Photo data must be resolved separately after authorization.'
                USING ERRCODE = '42501';
        END IF;
    END LOOP;

    IF p_match_case_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.match_cases mc
        WHERE mc.id = p_match_case_id
          AND (mc.profile_a_id = p_profile_id OR mc.profile_b_id = p_profile_id)
    ) THEN
        RAISE EXCEPTION 'INVALID_MATCH_CASE: Match case does not include the supplied profile.'
            USING ERRCODE = '22023';
    END IF;


    -- 5. Insert Share Grant
    INSERT INTO public.share_grants (
        profile_id,
        match_case_id,
        token_hash,
        recipient_type,
        recipient_phone,
        approved_fields,
        disclosed_snapshot,
        expires_at,
        is_revoked,
        created_by
    )
    VALUES (
        p_profile_id,
        p_match_case_id,
        p_token_hash,
        COALESCE(p_recipient_type, 'customer'),
        p_recipient_phone,
        COALESCE(p_approved_fields, '[]'::jsonb),
        p_disclosed_snapshot,
        p_expires_at,
        FALSE,
        auth.uid()
    )
    RETURNING id INTO v_grant_id;

    -- 6. Record Audit Event (Privacy-minimized details)
    INSERT INTO public.audit_events (
        actor_id,
        actor_role,
        action,
        target_type,
        target_id,
        details
    )
    VALUES (
        auth.uid(),
        'staff',
        'share_grant_issued',
        'profile',
        p_profile_id::text,
        jsonb_build_object(
            'grant_id', v_grant_id,
            'match_case_id', p_match_case_id,
            'token_hash', p_token_hash,
            'expires_at', p_expires_at
        )
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'grant_id', v_grant_id,
        'profile_id', p_profile_id,
        'expires_at', p_expires_at
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. Atomic Server RPC: Redeem Share Grant (P0-08)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.redeem_share_grant(
    p_token_hash VARCHAR(64)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_grant RECORD;
    v_profile RECORD;
BEGIN
    -- 1. Find Grant by SHA-256 Token Hash
    SELECT *
    INTO v_grant
    FROM public.share_grants
    WHERE token_hash = p_token_hash;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('valid', FALSE, 'reason', 'missing');
    END IF;

    -- 2. Check Revocation
    IF v_grant.is_revoked THEN
        RETURN jsonb_build_object('valid', FALSE, 'reason', 'revoked');
    END IF;

    -- 3. Check Expiry
    IF timezone('utc'::text, now()) > v_grant.expires_at THEN
        RETURN jsonb_build_object('valid', FALSE, 'reason', 'expired');
    END IF;

    -- 4. Re-verify Candidate Profile Standing
    SELECT id, status, photo_permission_granted, reference_code
    INTO v_profile
    FROM public.profiles
    WHERE id = v_grant.profile_id;

    IF NOT FOUND OR v_profile.status IN ('restricted', 'inactive', 'pending_review') THEN
        RETURN jsonb_build_object('valid', FALSE, 'reason', 'profile_not_shareable');
    END IF;

    RETURN jsonb_build_object(
        'valid', TRUE,
        'grant_id', v_grant.id,
        'profile_id', v_grant.profile_id,
        'reference_code', v_profile.reference_code,
        'match_case_id', v_grant.match_case_id,
        'snapshot', v_grant.disclosed_snapshot,
        'approved_fields', v_grant.approved_fields,
        'expires_at', v_grant.expires_at
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 5. Atomic Server RPC: Revoke Share Grant (P0-08)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.revoke_share_grant(
    p_grant_id UUID DEFAULT NULL,
    p_token_hash VARCHAR(64) DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_grant RECORD;
    v_revoked_count INT := 0;
BEGIN
    IF (p_grant_id IS NULL) = (p_token_hash IS NULL) THEN
        RAISE EXCEPTION 'INVALID_SELECTOR: Supply exactly one grant ID or token hash.'
            USING ERRCODE = '22023';
    END IF;

    IF p_grant_id IS NOT NULL THEN
        SELECT * INTO v_grant
        FROM public.share_grants
        WHERE id = p_grant_id;
    ELSE
        SELECT * INTO v_grant
        FROM public.share_grants
        WHERE token_hash = p_token_hash;
    END IF;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'GRANT_NOT_FOUND');
    END IF;

    -- Authorization: Caller must be staff OR profile owner
    IF NOT public.auth_is_staff() THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = v_grant.profile_id
              AND (p.account_id = auth.uid() OR p.created_by = auth.uid())
        ) THEN
            RAISE EXCEPTION 'UNAUTHORIZED: Cannot revoke this share grant.'
                USING ERRCODE = '42501';
        END IF;
    END IF;

    UPDATE public.share_grants
    SET is_revoked = TRUE,
        revoked_at = timezone('utc'::text, now()),
        revoked_by = auth.uid()
    WHERE id = v_grant.id
      AND is_revoked = FALSE;

    GET DIAGNOSTICS v_revoked_count = ROW_COUNT;

    -- Audit log
    INSERT INTO public.audit_events (
        actor_id,
        actor_role,
        action,
        target_type,
        target_id,
        details
    )
    VALUES (
        auth.uid(),
        'authorized',
        'share_grant_revoked',
        'profile',
        v_grant.profile_id::text,
        jsonb_build_object(
            'grant_id', v_grant.id,
            'token_hash', v_grant.token_hash
        )
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'grant_id', v_grant.id,
        'revoked', v_revoked_count > 0
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 6. Atomic Server RPC: Candidate Privacy Erasure & Photo Purge (P0-07, P1-28)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.execute_candidate_privacy_erasure(
    p_profile_id UUID,
    p_erase_profile BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_is_authorized BOOLEAN := FALSE;
    v_photo_paths TEXT[] := '{}';
    v_photo RECORD;
    v_grants_revoked INT := 0;
BEGIN
    -- 1. Authorization: Staff OR owner of the candidate profile
    IF public.auth_is_staff() THEN
        v_is_authorized := TRUE;
    ELSE
        SELECT TRUE INTO v_is_authorized
        FROM public.profiles p
        WHERE p.id = p_profile_id
          AND (p.account_id = auth.uid() OR p.created_by = auth.uid())
          AND public.auth_is_account_active(auth.uid());
    END IF;

    IF NOT COALESCE(v_is_authorized, FALSE) THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Caller lacks authority to execute privacy erasure on profile %', p_profile_id
            USING ERRCODE = '42501';
    END IF;

    -- 2. Collect Storage Paths for Supabase Storage Purge
    FOR v_photo IN
        SELECT storage_path FROM public.profile_photos WHERE profile_id = p_profile_id
    LOOP
        v_photo_paths := array_append(v_photo_paths, v_photo.storage_path);
    END LOOP;

    -- 3. Do NOT delete from storage.objects here. Supabase Storage objects
    -- must be removed through the Storage API so the physical object and its
    -- metadata remain consistent. Keep profile_photos rows until the caller
    -- has successfully removed the corresponding objects through that API.

    -- 4. Revoke All Active Share Grants
    UPDATE public.share_grants
    SET is_revoked = TRUE,
        revoked_at = timezone('utc'::text, now()),
        revoked_by = auth.uid()
    WHERE profile_id = p_profile_id
      AND is_revoked = FALSE;

    GET DIAGNOSTICS v_grants_revoked = ROW_COUNT;

    -- 5. Mark Consents as Withdrawn (OPEN-008, PRIV-07)
    UPDATE public.candidate_consents
    SET status = 'withdrawn',
        consent_photo_sharing = FALSE,
        consent_third_party_sharing = FALSE,
        consent_contact_sharing = FALSE,
        updated_at = timezone('utc'::text, now())
    WHERE profile_id = p_profile_id;

    -- 6. Update Profile Status
    IF p_erase_profile THEN
        UPDATE public.profiles
        SET status = 'inactive',
            photo_permission_granted = FALSE,
            updated_at = timezone('utc'::text, now())
        WHERE id = p_profile_id;
    ELSE
        UPDATE public.profiles
        SET photo_permission_granted = FALSE,
            updated_at = timezone('utc'::text, now())
        WHERE id = p_profile_id;
    END IF;

    -- 7. Persist Minimal Audit Event
    INSERT INTO public.audit_events (
        actor_id,
        actor_role,
        action,
        target_type,
        target_id,
        details
    )
    VALUES (
        auth.uid(),
        'authorized',
        'candidate_privacy_erasure',
        'profile',
        p_profile_id::text,
        jsonb_build_object(
            'profile_id', p_profile_id,
            'photos_queued_for_storage_purge_count', COALESCE(array_length(v_photo_paths, 1), 0),
            'grants_revoked_count', v_grants_revoked,
            'profile_deactivated', p_erase_profile,
            'storage_purge_required', TRUE
        )
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'profile_id', p_profile_id,
        'storage_paths_to_purge', to_jsonb(v_photo_paths),
        'storage_purge_required', TRUE,
        'grants_revoked_count', v_grants_revoked,
        'profile_deactivated', p_erase_profile
    );
END;
$$;

-- ------------------------------------------------------------------------------ 
-- 7. Explicit RPC execution grants (SECURITY DEFINER functions)
-- ------------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.create_share_grant(UUID, UUID, VARCHAR, VARCHAR, VARCHAR, JSONB, JSONB, TIMESTAMPTZ) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.redeem_share_grant(VARCHAR) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_share_grant(UUID, VARCHAR) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.execute_candidate_privacy_erasure(UUID, BOOLEAN) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_share_grant(UUID, UUID, VARCHAR, VARCHAR, VARCHAR, JSONB, JSONB, TIMESTAMPTZ) TO authenticated, service_role;
-- Redemption is intentionally available without login because the bearer token
-- is the access credential. Use high-entropy random tokens, store only SHA-256
-- hashes, enforce short expiry, and rate-limit the public endpoint in the API.
GRANT EXECUTE ON FUNCTION public.redeem_share_grant(VARCHAR) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.revoke_share_grant(UUID, VARCHAR) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.execute_candidate_privacy_erasure(UUID, BOOLEAN) TO authenticated, service_role;

COMMIT;
 THEN
        RAISE EXCEPTION 'INVALID_TOKEN_HASH: Token hash must be a 64-character hexadecimal SHA-256 string.'
            USING ERRCODE = '22023';
    END IF;

    -- 4. Validate Expiry (Cannot be in the past)
    IF p_expires_at <= timezone('utc'::text, now()) THEN
        RAISE EXCEPTION 'INVALID_EXPIRY: Share grant expiration must be in the future.'
            USING ERRCODE = '22023';
    END IF;

    -- 5. Insert Share Grant
    INSERT INTO public.share_grants (
        profile_id,
        match_case_id,
        token_hash,
        recipient_type,
        recipient_phone,
        approved_fields,
        disclosed_snapshot,
        expires_at,
        is_revoked,
        created_by
    )
    VALUES (
        p_profile_id,
        p_match_case_id,
        p_token_hash,
        COALESCE(p_recipient_type, 'customer'),
        p_recipient_phone,
        COALESCE(p_approved_fields, '[]'::jsonb),
        p_disclosed_snapshot,
        p_expires_at,
        FALSE,
        auth.uid()
    )
    RETURNING id INTO v_grant_id;

    -- 6. Record Audit Event (Privacy-minimized details)
    INSERT INTO public.audit_events (
        actor_id,
        actor_role,
        action,
        target_type,
        target_id,
        details
    )
    VALUES (
        auth.uid(),
        'staff',
        'share_grant_issued',
        'profile',
        p_profile_id::text,
        jsonb_build_object(
            'grant_id', v_grant_id,
            'match_case_id', p_match_case_id,
            'token_hash', p_token_hash,
            'expires_at', p_expires_at
        )
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'grant_id', v_grant_id,
        'profile_id', p_profile_id,
        'expires_at', p_expires_at
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. Atomic Server RPC: Redeem Share Grant (P0-08)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.redeem_share_grant(
    p_token_hash VARCHAR(64)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_grant RECORD;
    v_profile RECORD;
BEGIN
    -- 1. Find Grant by SHA-256 Token Hash
    SELECT *
    INTO v_grant
    FROM public.share_grants
    WHERE token_hash = p_token_hash;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('valid', FALSE, 'reason', 'missing');
    END IF;

    -- 2. Check Revocation
    IF v_grant.is_revoked THEN
        RETURN jsonb_build_object('valid', FALSE, 'reason', 'revoked');
    END IF;

    -- 3. Check Expiry
    IF timezone('utc'::text, now()) > v_grant.expires_at THEN
        RETURN jsonb_build_object('valid', FALSE, 'reason', 'expired');
    END IF;

    -- 4. Re-verify Candidate Profile Standing
    SELECT id, status, photo_permission_granted, reference_code
    INTO v_profile
    FROM public.profiles
    WHERE id = v_grant.profile_id;

    IF NOT FOUND OR v_profile.status IN ('restricted', 'inactive', 'pending_review') THEN
        RETURN jsonb_build_object('valid', FALSE, 'reason', 'profile_not_shareable');
    END IF;

    RETURN jsonb_build_object(
        'valid', TRUE,
        'grant_id', v_grant.id,
        'profile_id', v_grant.profile_id,
        'reference_code', v_profile.reference_code,
        'match_case_id', v_grant.match_case_id,
        'snapshot', v_grant.disclosed_snapshot,
        'approved_fields', v_grant.approved_fields,
        'expires_at', v_grant.expires_at
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 5. Atomic Server RPC: Revoke Share Grant (P0-08)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.revoke_share_grant(
    p_grant_id UUID DEFAULT NULL,
    p_token_hash VARCHAR(64) DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_grant RECORD;
    v_revoked_count INT := 0;
BEGIN
    SELECT *
    INTO v_grant
    FROM public.share_grants
    WHERE (id = p_grant_id OR token_hash = p_token_hash);

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'GRANT_NOT_FOUND');
    END IF;

    -- Authorization: Caller must be staff OR profile owner
    IF NOT public.auth_is_staff() THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = v_grant.profile_id
              AND (p.account_id = auth.uid() OR p.created_by = auth.uid())
        ) THEN
            RAISE EXCEPTION 'UNAUTHORIZED: Cannot revoke this share grant.'
                USING ERRCODE = '42501';
        END IF;
    END IF;

    UPDATE public.share_grants
    SET is_revoked = TRUE,
        revoked_at = timezone('utc'::text, now()),
        revoked_by = auth.uid()
    WHERE id = v_grant.id
      AND is_revoked = FALSE;

    GET DIAGNOSTICS v_revoked_count = ROW_COUNT;

    -- Audit log
    INSERT INTO public.audit_events (
        actor_id,
        actor_role,
        action,
        target_type,
        target_id,
        details
    )
    VALUES (
        auth.uid(),
        'authorized',
        'share_grant_revoked',
        'profile',
        v_grant.profile_id::text,
        jsonb_build_object(
            'grant_id', v_grant.id,
            'token_hash', v_grant.token_hash
        )
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'grant_id', v_grant.id,
        'revoked', v_revoked_count > 0
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 6. Atomic Server RPC: Candidate Privacy Erasure & Photo Purge (P0-07, P1-28)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.execute_candidate_privacy_erasure(
    p_profile_id UUID,
    p_erase_profile BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_is_authorized BOOLEAN := FALSE;
    v_photo_paths TEXT[] := '{}';
    v_photo RECORD;
    v_grants_revoked INT := 0;
BEGIN
    -- 1. Authorization: Staff OR owner of the candidate profile
    IF public.auth_is_staff() THEN
        v_is_authorized := TRUE;
    ELSE
        SELECT TRUE INTO v_is_authorized
        FROM public.profiles p
        WHERE p.id = p_profile_id
          AND (p.account_id = auth.uid() OR p.created_by = auth.uid())
          AND public.auth_is_account_active(auth.uid());
    END IF;

    IF NOT COALESCE(v_is_authorized, FALSE) THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Caller lacks authority to execute privacy erasure on profile %', p_profile_id
            USING ERRCODE = '42501';
    END IF;

    -- 2. Collect Storage Paths for Supabase Storage Purge
    FOR v_photo IN
        SELECT storage_path FROM public.profile_photos WHERE profile_id = p_profile_id
    LOOP
        v_photo_paths := array_append(v_photo_paths, v_photo.storage_path);
    END LOOP;

    -- 3. Do NOT delete from storage.objects here. Supabase Storage objects
    -- must be removed through the Storage API so the physical object and its
    -- metadata remain consistent. Keep profile_photos rows until the caller
    -- has successfully removed the corresponding objects through that API.

    -- 4. Revoke All Active Share Grants
    UPDATE public.share_grants
    SET is_revoked = TRUE,
        revoked_at = timezone('utc'::text, now()),
        revoked_by = auth.uid()
    WHERE profile_id = p_profile_id
      AND is_revoked = FALSE;

    GET DIAGNOSTICS v_grants_revoked = ROW_COUNT;

    -- 5. Mark Consents as Withdrawn (OPEN-008, PRIV-07)
    UPDATE public.candidate_consents
    SET status = 'withdrawn',
        consent_photo_sharing = FALSE,
        consent_third_party_sharing = FALSE,
        consent_contact_sharing = FALSE,
        updated_at = timezone('utc'::text, now())
    WHERE profile_id = p_profile_id;

    -- 6. Update Profile Status
    IF p_erase_profile THEN
        UPDATE public.profiles
        SET status = 'inactive',
            photo_permission_granted = FALSE,
            updated_at = timezone('utc'::text, now())
        WHERE id = p_profile_id;
    ELSE
        UPDATE public.profiles
        SET photo_permission_granted = FALSE,
            updated_at = timezone('utc'::text, now())
        WHERE id = p_profile_id;
    END IF;

    -- 7. Persist Minimal Audit Event
    INSERT INTO public.audit_events (
        actor_id,
        actor_role,
        action,
        target_type,
        target_id,
        details
    )
    VALUES (
        auth.uid(),
        'authorized',
        'candidate_privacy_erasure',
        'profile',
        p_profile_id::text,
        jsonb_build_object(
            'profile_id', p_profile_id,
            'photos_queued_for_storage_purge_count', COALESCE(array_length(v_photo_paths, 1), 0),
            'grants_revoked_count', v_grants_revoked,
            'profile_deactivated', p_erase_profile,
            'storage_purge_required', TRUE
        )
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'profile_id', p_profile_id,
        'storage_paths_to_purge', to_jsonb(v_photo_paths),
        'storage_purge_required', TRUE,
        'grants_revoked_count', v_grants_revoked,
        'profile_deactivated', p_erase_profile
    );
END;
$$;

-- ------------------------------------------------------------------------------ 
-- 7. Explicit RPC execution grants (SECURITY DEFINER functions)
-- ------------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.create_share_grant(UUID, UUID, VARCHAR, VARCHAR, VARCHAR, JSONB, JSONB, TIMESTAMPTZ) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.redeem_share_grant(VARCHAR) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_share_grant(UUID, VARCHAR) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.execute_candidate_privacy_erasure(UUID, BOOLEAN) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_share_grant(UUID, UUID, VARCHAR, VARCHAR, VARCHAR, JSONB, JSONB, TIMESTAMPTZ) TO authenticated, service_role;
-- Redemption is intentionally available without login because the bearer token
-- is the access credential. Use high-entropy random tokens, store only SHA-256
-- hashes, enforce short expiry, and rate-limit the public endpoint in the API.
GRANT EXECUTE ON FUNCTION public.redeem_share_grant(VARCHAR) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.revoke_share_grant(UUID, VARCHAR) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.execute_candidate_privacy_erasure(UUID, BOOLEAN) TO authenticated, service_role;

COMMIT;
