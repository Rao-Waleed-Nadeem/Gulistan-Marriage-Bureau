-- ==============================================================================
-- Gulistan Marriage Bureau — Migration 00001: Initial Schema & Access Baseline
-- ==============================================================================
-- Architectural Scope:
--   - Role system (user_roles with app_role enum: admin, matchmaker, customer)
--   - Security helper functions (auth_has_role, auth_is_staff)
--   - Candidate Profiles baseline (profiles) with constraints and indexes
--   - Candidate Consents baseline (candidate_consents) per OPEN-004
--   - Append-only Audit Trail (audit_events)
--   - Row-Level Security (RLS) enabled on all tables with explicit grants and policies
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. App Roles & Identity Access
-- ------------------------------------------------------------------------------

-- Create role enum if not exists
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'matchmaker', 'customer');
    END IF;
END $$;

-- User Roles Table (Joined to auth.users)
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role public.app_role NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    assigned_by UUID NULL,
    CONSTRAINT uq_user_roles_user_role UNIQUE (user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles (user_id);

-- Helper Function: Check if current authenticated user has a specific role
CREATE OR REPLACE FUNCTION public.auth_has_role(required_role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = auth.uid()
          AND role = required_role
    );
$$;

-- Helper Function: Check if current user is staff (admin or matchmaker)
CREATE OR REPLACE FUNCTION public.auth_is_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = auth.uid()
          AND role IN ('admin'::public.app_role, 'matchmaker'::public.app_role)
    );
$$;

-- ------------------------------------------------------------------------------
-- 2. Core Candidate Profiles
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_code VARCHAR(20) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    gender VARCHAR(10) NOT NULL,
    age INT NOT NULL,
    dob DATE NULL,
    height_inches INT NOT NULL,
    height_display VARCHAR(20) NOT NULL,
    marital_status VARCHAR(30) NOT NULL,
    religion VARCHAR(50) NOT NULL DEFAULT 'Islam',
    aqeedah VARCHAR(100) NOT NULL,
    caste VARCHAR(100) NOT NULL,
    sub_caste VARCHAR(100) NULL,
    education_level VARCHAR(100) NOT NULL,
    education_field VARCHAR(150) NOT NULL,
    occupation VARCHAR(150) NOT NULL,
    job_title VARCHAR(150) NOT NULL,
    company_or_sector VARCHAR(200) NULL,
    monthly_income_pkr NUMERIC(12, 2) NULL,
    hometown VARCHAR(100) NOT NULL,
    current_city VARCHAR(100) NOT NULL,
    residence_area VARCHAR(150) NOT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'pending_review',
    source VARCHAR(40) NOT NULL DEFAULT 'walk_in',
    assigned_matchmaker_id UUID NULL,
    contact_person VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50) NOT NULL,
    contact_email VARCHAR(255) NULL,
    preferred_contact_method VARCHAR(20) NOT NULL DEFAULT 'whatsapp',
    photo_permission_granted BOOLEAN NOT NULL DEFAULT FALSE,
    representative_consent_certified BOOLEAN NOT NULL DEFAULT TRUE,
    internal_notes TEXT NULL,
    created_by UUID NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    -- Integrity Constraints
    CONSTRAINT uq_profiles_reference_code UNIQUE (reference_code),
    CONSTRAINT chk_profiles_gender CHECK (gender IN ('male', 'female')),
    CONSTRAINT chk_profiles_age CHECK (age >= 18 AND age <= 100),
    CONSTRAINT chk_profiles_height_inches CHECK (height_inches >= 48 AND height_inches <= 96),
    CONSTRAINT chk_profiles_marital_status CHECK (marital_status IN ('never_married', 'divorced', 'widowed', 'khula')),
    CONSTRAINT chk_profiles_income CHECK (monthly_income_pkr IS NULL OR monthly_income_pkr >= 0),
    CONSTRAINT chk_profiles_status CHECK (status IN ('pending_review', 'approved', 'active', 'introduction_authorized', 'inactive', 'restricted')),
    CONSTRAINT chk_profiles_source CHECK (source IN ('direct_web', 'walk_in', 'external_matchmaker', 'phone_referral')),
    CONSTRAINT chk_profiles_contact_method CHECK (preferred_contact_method IN ('whatsapp', 'phone', 'email')),
    CONSTRAINT chk_profiles_consent_certified CHECK (representative_consent_certified = TRUE)
);

-- Operational Query Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles (status);
CREATE INDEX IF NOT EXISTS idx_profiles_gender ON public.profiles (gender);
CREATE INDEX IF NOT EXISTS idx_profiles_current_city ON public.profiles (current_city);
CREATE INDEX IF NOT EXISTS idx_profiles_caste ON public.profiles (caste);
CREATE INDEX IF NOT EXISTS idx_profiles_marital_status ON public.profiles (marital_status);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_created_by ON public.profiles (created_by);

-- ------------------------------------------------------------------------------
-- 3. Candidate Consents (Per DECIDED: OPEN-004)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.candidate_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    consent_type VARCHAR(50) NOT NULL,
    is_granted BOOLEAN NOT NULL DEFAULT TRUE,
    submitter_relationship VARCHAR(50) NOT NULL,
    submitter_name VARCHAR(255) NOT NULL,
    certified_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    ip_address VARCHAR(45) NULL,

    CONSTRAINT chk_consent_type CHECK (consent_type IN ('profile_intake', 'photo_storage', 'photo_disclosure', 'third_party_share')),
    CONSTRAINT chk_submitter_relationship CHECK (submitter_relationship IN ('self', 'father', 'mother', 'brother', 'sister', 'guardian', 'other'))
);

CREATE INDEX IF NOT EXISTS idx_candidate_consents_profile_id ON public.candidate_consents (profile_id);

-- ------------------------------------------------------------------------------
-- 4. Append-Only Audit Trail
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NULL,
    actor_role VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id VARCHAR(100) NOT NULL,
    details TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_events_target ON public.audit_events (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON public.audit_events (created_at DESC);

-- ------------------------------------------------------------------------------
-- 5. Row-Level Security (RLS) Enablement & Access Control Baseline
-- ------------------------------------------------------------------------------

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- Revoke default public execution privileges
REVOKE ALL ON TABLE public.user_roles FROM public, anon;
REVOKE ALL ON TABLE public.profiles FROM public, anon;
REVOKE ALL ON TABLE public.candidate_consents FROM public, anon;
REVOKE ALL ON TABLE public.audit_events FROM public, anon;

-- Grant least-privilege permissions to authenticated users
GRANT SELECT ON TABLE public.user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT, INSERT ON TABLE public.candidate_consents TO authenticated;
GRANT SELECT, INSERT ON TABLE public.audit_events TO authenticated;

-- Service role retains full administrative access
GRANT ALL ON TABLE public.user_roles TO service_role;
GRANT ALL ON TABLE public.profiles TO service_role;
GRANT ALL ON TABLE public.candidate_consents TO service_role;
GRANT ALL ON TABLE public.audit_events TO service_role;

-- ------------------------------------------------------------------------------
-- 6. RLS Policies
-- ------------------------------------------------------------------------------

-- [user_roles] Policies:
-- Users can view their own assigned roles
CREATE POLICY user_roles_select_own ON public.user_roles
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR public.auth_has_role('admin'::public.app_role));

-- Only admins can assign or modify roles
CREATE POLICY user_roles_admin_manage ON public.user_roles
    FOR ALL
    TO authenticated
    USING (public.auth_has_role('admin'::public.app_role))
    WITH CHECK (public.auth_has_role('admin'::public.app_role));

-- [profiles] Policies:
-- Staff (Nadeem, Admin) can view all profiles
CREATE POLICY profiles_staff_select ON public.profiles
    FOR SELECT
    TO authenticated
    USING (public.auth_is_staff());

-- Customers can view only their own linked profile
CREATE POLICY profiles_customer_select_own ON public.profiles
    FOR SELECT
    TO authenticated
    USING (created_by = auth.uid());

-- Staff can insert profiles (Closed Concierge Intake per OPEN-003)
CREATE POLICY profiles_staff_insert ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (public.auth_is_staff());

-- Staff can update profiles
CREATE POLICY profiles_staff_update ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (public.auth_is_staff())
    WITH CHECK (public.auth_is_staff());

-- [candidate_consents] Policies:
CREATE POLICY consents_staff_select ON public.candidate_consents
    FOR SELECT
    TO authenticated
    USING (public.auth_is_staff());

CREATE POLICY consents_customer_select_own ON public.candidate_consents
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = candidate_consents.profile_id
              AND p.created_by = auth.uid()
        )
    );

CREATE POLICY consents_insert ON public.candidate_consents
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.auth_is_staff() OR
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = candidate_consents.profile_id
              AND p.created_by = auth.uid()
        )
    );

-- [audit_events] Policies:
-- Append-only: authenticated users can insert audit events
CREATE POLICY audit_events_insert ON public.audit_events
    FOR INSERT
    TO authenticated
    WITH CHECK (actor_id = auth.uid() OR actor_id IS NULL);

-- Only staff can read audit events
CREATE POLICY audit_events_staff_select ON public.audit_events
    FOR SELECT
    TO authenticated
    USING (public.auth_is_staff());

-- Strictly NO UPDATE or DELETE policies for audit_events (Enforces Append-Only Ledger)

COMMIT;
