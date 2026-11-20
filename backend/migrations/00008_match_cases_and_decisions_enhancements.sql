-- ==============================================================================
-- Migration: 00008_match_cases_and_decisions_enhancements.sql
-- Description: Task T-035 Remediation
--   - Canonical profile pair unique index on match_cases (P1-23)
--   - Server-side RPC get_or_create_match_case ensuring canonical pair ordering (P1-23)
--   - Tightened match decision permissions to matchmaker (Nadeem) role (P1-22)
--   - Atomic decision recording RPC record_match_decision enforcing:
--       * Nadeem matchmaker role or audited admin override (P1-22)
--       * Evaluation prerequisite: latest evaluation must exist and have mandatory_satisfied = TRUE (P1-20)
--       * Atomic insert of match_decisions and update of match_cases.status (P1-21)
--   - Zero mock or synthetic candidate data seeding
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. Canonical Profile Pair Unique Index (P1-23)
-- ------------------------------------------------------------------------------
-- Ensure that regardless of whether a pair is queried or inserted as (A, B) or (B, A),
-- exactly one canonical record can exist in public.match_cases.
CREATE UNIQUE INDEX IF NOT EXISTS uq_match_cases_canonical_pair
ON public.match_cases (LEAST(profile_a_id, profile_b_id), GREATEST(profile_a_id, profile_b_id));

-- ------------------------------------------------------------------------------
-- 2. Server-Side Canonical Match Case Lookup / Creation (P1-23, P0-06)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_or_create_match_case(
    p_profile_a_id UUID,
    p_profile_b_id UUID,
    p_created_by UUID DEFAULT NULL
)
RETURNS public.match_cases
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_low_id UUID;
    v_high_id UUID;
    v_case public.match_cases;
    v_caller_id UUID;
    v_case_code VARCHAR(30);
BEGIN
    IF p_profile_a_id IS NULL OR p_profile_b_id IS NULL THEN
        RAISE EXCEPTION 'INVALID_PROFILES: Profile IDs must not be null';
    END IF;

    IF p_profile_a_id = p_profile_b_id THEN
        RAISE EXCEPTION 'SELF_PAIR_PROHIBITED: A profile cannot be matched with itself';
    END IF;

    -- Verify caller is bureau staff or service role
    IF NOT (public.auth_is_staff() OR auth.role() = 'service_role') THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Only bureau staff may create or access match cases';
    END IF;

    -- Canonicalize profile pair order
    v_low_id := LEAST(p_profile_a_id, p_profile_b_id);
    v_high_id := GREATEST(p_profile_a_id, p_profile_b_id);
    v_caller_id := COALESCE(p_created_by, auth.uid());

    -- Look for existing case in either orientation
    SELECT * INTO v_case
    FROM public.match_cases
    WHERE (profile_a_id = v_low_id AND profile_b_id = v_high_id)
       OR (profile_a_id = v_high_id AND profile_b_id = v_low_id)
    LIMIT 1;

    IF v_case.id IS NOT NULL THEN
        RETURN v_case;
    END IF;

    -- Generate unique case code MC-XXXX-YYYY-NNN
    v_case_code := 'MC-' || UPPER(SUBSTRING(REPLACE(v_low_id::text, '-', '') FROM 1 FOR 4)) || '-' ||
                            UPPER(SUBSTRING(REPLACE(v_high_id::text, '-', '') FROM 1 FOR 4)) || '-' ||
                            FLOOR(100 + RANDOM() * 900)::text;

    -- Insert canonical pair
    INSERT INTO public.match_cases (
        case_code,
        profile_a_id,
        profile_b_id,
        status,
        created_by,
        created_at,
        updated_at
    ) VALUES (
        v_case_code,
        v_low_id,
        v_high_id,
        'suggested',
        v_caller_id,
        timezone('utc'::text, now()),
        timezone('utc'::text, now())
    )
    RETURNING * INTO v_case;

    RETURN v_case;
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. Atomic Decision Recording RPC (P1-20, P1-21, P1-22)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_match_decision(
    p_match_case_id UUID,
    p_decision VARCHAR(30),
    p_reason_code VARCHAR(100),
    p_notes TEXT DEFAULT NULL,
    p_decided_by UUID DEFAULT NULL,
    p_admin_override BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_case public.match_cases;
    v_latest_eval public.match_evaluations;
    v_caller_id UUID;
    v_decision_id UUID;
    v_new_status VARCHAR(40);
    v_is_matchmaker BOOLEAN;
    v_is_admin BOOLEAN;
BEGIN
    v_caller_id := COALESCE(p_decided_by, auth.uid());

    -- Validate decision value
    IF p_decision NOT IN ('approved', 'rejected', 'deferred') THEN
        RAISE EXCEPTION 'INVALID_DECISION: Decision must be approved, rejected, or deferred';
    END IF;

    -- 1. Authorization check: Nadeem (matchmaker) or audited admin override (P1-22)
    v_is_matchmaker := public.auth_has_role('matchmaker'::public.app_role);
    v_is_admin := public.auth_has_role('admin'::public.app_role) OR auth.role() = 'service_role';

    IF NOT (v_is_matchmaker OR v_is_admin) THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Only matchmaker Nadeem or an authorized bureau administrator may record match decisions';
    END IF;

    IF v_is_admin AND NOT v_is_matchmaker AND auth.role() <> 'service_role' THEN
        IF p_admin_override IS NOT TRUE THEN
            RAISE EXCEPTION 'ADMIN_OVERRIDE_REQUIRED: Administrative match decision requires explicit admin_override flag';
        END IF;

        -- Record audited admin override event
        INSERT INTO public.audit_events (
            actor_id,
            actor_role,
            action,
            target_type,
            target_id,
            details
        ) VALUES (
            v_caller_id,
            'admin',
            'match_approval_admin_override',
            'match_case',
            p_match_case_id::text,
            jsonb_build_object(
                'decision', p_decision,
                'reason_code', p_reason_code,
                'admin_override', true,
                'notes', p_notes
            )::text
        );
    END IF;

    -- 2. Verify match case exists (lock row for status update)
    SELECT * INTO v_case
    FROM public.match_cases
    WHERE id = p_match_case_id
    FOR UPDATE;

    IF v_case.id IS NULL THEN
        RAISE EXCEPTION 'NOT_FOUND: Match case % not found', p_match_case_id;
    END IF;

    -- 3. Evaluation prerequisite check for approval (P1-20)
    IF p_decision = 'approved' THEN
        SELECT * INTO v_latest_eval
        FROM public.match_evaluations
        WHERE match_case_id = p_match_case_id
        ORDER BY evaluated_at DESC
        LIMIT 1;

        IF v_latest_eval.id IS NULL THEN
            RAISE EXCEPTION 'NO_EVALUATION_FOUND: A match proposal cannot be approved without a persisted match evaluation';
        END IF;

        IF v_latest_eval.mandatory_satisfied IS NOT TRUE THEN
            RAISE EXCEPTION 'CANNOT_APPROVE_INELIGIBLE_MATCH: Mandatory matching criteria are not satisfied';
        END IF;
    END IF;

    -- 4. Atomic decision insertion and status update in a single transaction (P1-21)
    INSERT INTO public.match_decisions (
        match_case_id,
        decision,
        decided_by,
        reason_code,
        notes,
        decided_at
    ) VALUES (
        p_match_case_id,
        p_decision,
        v_caller_id,
        p_reason_code,
        p_notes,
        timezone('utc'::text, now())
    )
    RETURNING id INTO v_decision_id;

    v_new_status := CASE
        WHEN p_decision = 'approved' THEN 'approved_by_nadeem'
        WHEN p_decision = 'rejected' THEN 'rejected'
        WHEN p_decision = 'deferred' THEN 'deferred'
        ELSE v_case.status
    END;

    UPDATE public.match_cases
    SET status = v_new_status,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_match_case_id;

    RETURN jsonb_build_object(
        'decision_id', v_decision_id,
        'match_case_id', p_match_case_id,
        'decision', p_decision,
        'status', v_new_status,
        'decided_by', v_caller_id,
        'reason_code', p_reason_code,
        'notes', p_notes,
        'decided_at', timezone('utc'::text, now())
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. Tighten Row-Level Security on match_decisions (P1-22)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS decisions_staff_manage ON public.match_decisions;

CREATE POLICY decisions_matchmaker_manage ON public.match_decisions
    FOR ALL TO authenticated
    USING (public.auth_has_role('matchmaker'::public.app_role) OR public.auth_has_role('admin'::public.app_role))
    WITH CHECK (public.auth_has_role('matchmaker'::public.app_role) OR public.auth_has_role('admin'::public.app_role));

-- ------------------------------------------------------------------------------
-- 5. Execution Grants for Authenticated and Service Role
-- ------------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.get_or_create_match_case TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_match_case TO service_role;
GRANT EXECUTE ON FUNCTION public.record_match_decision TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_match_decision TO service_role;

COMMIT;
