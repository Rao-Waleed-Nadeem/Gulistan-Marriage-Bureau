-- ==============================================================================
-- Gulistan Marriage Bureau — Migration 00005: Auth Account Status, Customer Ownership,
-- Consent Schema Corrections, Database Lifecycle State Machine, and Audit Integrity
-- ==============================================================================
-- Architectural & Security Invariants:
--   - Remediation of Independent Audit Findings:
--       * P0-03 & P0-15: Customer profile ownership (account_id) and self-service intake policy
--       * P0-04: Drop contradictory consent constraint and remove automatic true defaults
--       * P0-05: Database-enforced profile status state machine trigger and automatic status history
--       * P0-13 & P0-14: Audit trail least-privilege insert policy and trusted RPC
--       * P0-16: Account status enforcement (active vs suspended / pending_verification) in RLS
--   - Safe, additive migration: wraps all DDL in a transaction block (BEGIN ... COMMIT)
--   - No mock or synthetic candidate data seeding
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. Customer Profile Ownership (account_id) & Self-Service Intake RLS (P0-03, P0-15)
-- ------------------------------------------------------------------------------

-- Add account_id to profiles to bind profile ownership to customer auth.users accounts
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_id UUID NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_account_id ON public.profiles (account_id);

-- Helper function to verify whether a user account is active
CREATE OR REPLACE FUNCTION public.auth_is_account_active(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT CASE 
        WHEN EXISTS (SELECT 1 FROM public.user_profiles WHERE id = p_user_id AND account_status IN ('suspended', 'pending_verification')) THEN FALSE
        ELSE TRUE
    END;
$$;

-- Helper function for staff authentication with active account verification (P0-16)
CREATE OR REPLACE FUNCTION public.auth_is_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role IN ('admin'::public.app_role, 'matchmaker'::public.app_role)
          AND public.auth_is_account_active(auth.uid())
    );
$$;

-- Replace Customer SELECT policy to recognize account_id (owner) and active account status
DROP POLICY IF EXISTS profiles_customer_select_own ON public.profiles;
CREATE POLICY profiles_customer_select_own ON public.profiles
    FOR SELECT
    TO authenticated
    USING (
        (account_id = auth.uid() OR created_by = auth.uid())
        AND public.auth_is_account_active(auth.uid())
    );

-- Customer Self-Service Intake INSERT Policy (P0-03)
-- Authenticated customers can insert their own profile ONLY if:
--   - account_id matches their authenticated user ID
--   - source is strictly 'direct_web'
--   - status is strictly 'pending_review'
--   - account is active
DROP POLICY IF EXISTS profiles_customer_insert ON public.profiles;
CREATE POLICY profiles_customer_insert ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (
        account_id = auth.uid()
        AND source = 'direct_web'
        AND status = 'pending_review'
        AND public.auth_is_account_active(auth.uid())
    );

-- Customer UPDATE Policy: Customers can only edit their own draft profile while in 'pending_review'
DROP POLICY IF EXISTS profiles_customer_update ON public.profiles;
CREATE POLICY profiles_customer_update ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (
        (account_id = auth.uid() OR created_by = auth.uid())
        AND status = 'pending_review'
        AND public.auth_is_account_active(auth.uid())
    )
    WITH CHECK (
        (account_id = auth.uid() OR created_by = auth.uid())
        AND status = 'pending_review'
        AND public.auth_is_account_active(auth.uid())
    );

-- ------------------------------------------------------------------------------
-- 2. Consent Schema Corrections (P0-04)
-- ------------------------------------------------------------------------------

-- Drop contradictory check constraint that forced representative_consent_certified = TRUE
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS chk_profiles_consent_certified;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS chk_rep_consent_cert;
ALTER TABLE public.profiles ALTER COLUMN representative_consent_certified SET DEFAULT FALSE;

-- Fix candidate_consents: remove automatic true defaults and enforce explicit status
ALTER TABLE public.candidate_consents ALTER COLUMN is_granted DROP DEFAULT;
ALTER TABLE public.candidate_consents ALTER COLUMN certified_at DROP DEFAULT;
ALTER TABLE public.candidate_consents ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending';
ALTER TABLE public.candidate_consents DROP CONSTRAINT IF EXISTS chk_consent_status;
ALTER TABLE public.candidate_consents ADD CONSTRAINT chk_consent_status 
    CHECK (status IN ('granted', 'withdrawn', 'pending', 'expired'));

-- ------------------------------------------------------------------------------
-- 3. Database-Enforced Profile Lifecycle State Machine (P0-05)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.validate_profile_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- No change in status: allow update
    IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
        RETURN NEW;
    END IF;

    -- Valid state transitions (DECIDED: OPEN-007):
    -- pending_review -> approved, restricted
    -- approved -> active, restricted
    -- active -> introduction_authorized, inactive, restricted
    -- introduction_authorized -> active, inactive
    -- inactive -> pending_review
    -- restricted -> pending_review
    IF (OLD.status = 'pending_review' AND NEW.status IN ('approved', 'restricted')) OR
       (OLD.status = 'approved' AND NEW.status IN ('active', 'restricted')) OR
       (OLD.status = 'active' AND NEW.status IN ('introduction_authorized', 'inactive', 'restricted')) OR
       (OLD.status = 'introduction_authorized' AND NEW.status IN ('active', 'inactive')) OR
       (OLD.status = 'inactive' AND NEW.status = 'pending_review') OR
       (OLD.status = 'restricted' AND NEW.status = 'pending_review') THEN

        -- Transition permitted: record audit history row automatically
        INSERT INTO public.profile_status_history (
            profile_id,
            old_status,
            new_status,
            changed_by,
            reason_code,
            notes
        ) VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            auth.uid(),
            'LIFECYCLE_TRANSITION',
            'Database-enforced state machine transition'
        );

        RETURN NEW;
    ELSE
        RAISE EXCEPTION 'Invalid profile status transition from "%" to "%"', OLD.status, NEW.status
            USING ERRCODE = '22000';
    END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_status_lifecycle ON public.profiles;
CREATE TRIGGER trg_profile_status_lifecycle
    BEFORE UPDATE OF status ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_profile_status_transition();

-- ------------------------------------------------------------------------------
-- 4. Audit Trail Integrity & Least Privilege (P0-13, P0-14)
-- ------------------------------------------------------------------------------

-- Disallow client-supplied NULL actor identity for authenticated events
DROP POLICY IF EXISTS audit_events_insert ON public.audit_events;
CREATE POLICY audit_events_insert ON public.audit_events
    FOR INSERT
    TO authenticated
    WITH CHECK (
        actor_id = auth.uid()
        AND public.auth_is_account_active(auth.uid())
    );

-- Trusted server-side RPC for logging audit events with automatic role binding
CREATE OR REPLACE FUNCTION public.record_audit_event(
    p_action VARCHAR(100),
    p_target_type VARCHAR(50),
    p_target_id VARCHAR(100),
    p_details TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_id UUID;
    v_actor_role VARCHAR(50);
    v_event_id UUID;
BEGIN
    v_actor_id := auth.uid();
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthenticated audit event rejected';
    END IF;

    IF NOT public.auth_is_account_active(v_actor_id) THEN
        RAISE EXCEPTION 'Suspended user cannot record audit events';
    END IF;

    SELECT role::text INTO v_actor_role FROM public.user_roles WHERE user_id = v_actor_id LIMIT 1;
    IF v_actor_role IS NULL THEN
        v_actor_role := 'customer';
    END IF;

    INSERT INTO public.audit_events (
        actor_id, actor_role, action, target_type, target_id, details
    ) VALUES (
        v_actor_id, v_actor_role, p_action, p_target_type, p_target_id, p_details
    ) RETURNING id INTO v_event_id;

    RETURN v_event_id;
END;
$$;

COMMIT;
