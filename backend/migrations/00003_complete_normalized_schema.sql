-- ==============================================================================
-- Gulistan Marriage Bureau — Migration 00003: Complete Normalized Domain Schema
-- ==============================================================================
-- Architectural Scope:
--   - User Profiles & Preferences (user_profiles, app_settings)
--   - Normalized Candidate Profile Child Entities:
--       * profile_preferences
--       * profile_siblings (structured spouse/family per OPEN-011)
--       * profile_property_details (Pakistani land units per OPEN-011)
--       * profile_photos (private storage metadata per OPEN-004/OPEN-008)
--       * profile_status_history (auditable lifecycle state transitions)
--   - Matching & Introductions:
--       * match_cases (candidate pairs and deduplication)
--       * match_evaluations (deterministic algorithm versioning & criteria breakdown)
--       * match_decisions (human matchmaker approvals per Nadeem requirement)
--       * share_grants (secure 64-char token hash, fixed approved snapshot, expiry)
--   - External Partners & CRM:
--       * external_matchmakers & matchmaker_agreements (varying partner fee models)
--       * crm_follow_ups (durable task scheduling, overdue states, and idempotency)
--   - Security:
--       * RLS enabled on all 14 tables
--       * Explicit REVOKE from public, anon
--       * Least privilege for authenticated users; service_role full administrative access
--       * No mock or synthetic candidate data seeding
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. Identity & Application Settings
-- ------------------------------------------------------------------------------

-- User Profiles (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    preferred_language VARCHAR(5) NOT NULL DEFAULT 'ur',
    account_status VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT chk_user_profiles_lang CHECK (preferred_language IN ('ur', 'en')),
    CONSTRAINT chk_user_profiles_status CHECK (account_status IN ('active', 'suspended', 'pending_verification'))
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles (email);

-- System & Regional Settings
CREATE TABLE IF NOT EXISTS public.app_settings (
    key VARCHAR(100) PRIMARY KEY,
    value_json JSONB NOT NULL,
    description TEXT NULL,
    updated_by UUID NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 2. Normalized Profile Sub-Entities
-- ------------------------------------------------------------------------------

-- Profile Preferences (Spouse Criteria)
CREATE TABLE IF NOT EXISTS public.profile_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    age_min INT NULL,
    age_max INT NULL,
    height_min_inches INT NULL,
    height_max_inches INT NULL,
    marital_status VARCHAR(30) NULL,
    religion VARCHAR(50) NULL,
    aqeedah VARCHAR(100) NULL,
    caste VARCHAR(100) NULL,
    education VARCHAR(100) NULL,
    occupations TEXT[] NULL,
    cities TEXT[] NULL,
    property_expectation VARCHAR(100) NULL,
    family_arrangement VARCHAR(50) NULL,
    lifestyle_notes TEXT NULL,
    criteria_classifications JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uq_profile_preferences_profile UNIQUE (profile_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_preferences_profile ON public.profile_preferences (profile_id);

-- Profile Siblings (OPEN-011 Structured Sibling Record)
CREATE TABLE IF NOT EXISTS public.profile_siblings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    relation VARCHAR(20) NOT NULL,
    name VARCHAR(255) NULL,
    gender VARCHAR(10) NOT NULL,
    age INT NULL,
    marital_status VARCHAR(30) NULL,
    occupation VARCHAR(150) NULL,
    education VARCHAR(100) NULL,
    marriage_details TEXT NULL,
    spouse_family_details TEXT NULL,
    children_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT chk_sibling_relation CHECK (relation IN ('brother', 'sister')),
    CONSTRAINT chk_sibling_children CHECK (children_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_profile_siblings_profile ON public.profile_siblings (profile_id);

-- Profile Property Details (OPEN-011 Pakistani Land Units)
CREATE TABLE IF NOT EXISTS public.profile_property_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    ownership VARCHAR(30) NOT NULL DEFAULT 'owned',
    property_type VARCHAR(50) NOT NULL DEFAULT 'house',
    area_marlas NUMERIC(10, 2) NOT NULL DEFAULT 0,
    area_kanal_display VARCHAR(50) NULL,
    approx_value_pkr NUMERIC(14, 2) NULL,
    city VARCHAR(100) NOT NULL,
    locality VARCHAR(150) NOT NULL,
    household_arrangement VARCHAR(50) NOT NULL DEFAULT 'independent',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT uq_profile_property_profile UNIQUE (profile_id),
    CONSTRAINT chk_property_area CHECK (area_marlas >= 0)
);

CREATE INDEX IF NOT EXISTS idx_profile_property_profile ON public.profile_property_details (profile_id);

-- Profile Private Photos (OPEN-004 & OPEN-008)
CREATE TABLE IF NOT EXISTS public.profile_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    storage_bucket VARCHAR(100) NOT NULL DEFAULT 'candidate-photos',
    storage_path VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(50) NOT NULL,
    file_size_bytes INT NOT NULL,
    upload_consent_id UUID NULL REFERENCES public.candidate_consents(id),
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    review_status VARCHAR(30) NOT NULL DEFAULT 'pending_review',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT chk_photo_size CHECK (file_size_bytes > 0 AND file_size_bytes <= 5242880),
    CONSTRAINT chk_photo_mime CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
    CONSTRAINT chk_photo_status CHECK (review_status IN ('pending_review', 'approved', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_profile_photos_profile ON public.profile_photos (profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_photos_primary ON public.profile_photos (profile_id, is_primary);

-- Profile Status History (State Machine Lifecycle Audit)
CREATE TABLE IF NOT EXISTS public.profile_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    old_status VARCHAR(40) NOT NULL,
    new_status VARCHAR(40) NOT NULL,
    changed_by UUID NULL,
    reason_code VARCHAR(100) NOT NULL,
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_profile_status_history_profile ON public.profile_status_history (profile_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- 3. External Matchmakers & Business Agreements
-- ------------------------------------------------------------------------------

-- External Matchmaker Agency Directory
CREATE TABLE IF NOT EXISTS public.external_matchmakers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    agency_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255) NULL,
    city VARCHAR(100) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    commission_model VARCHAR(50) NOT NULL DEFAULT 'percentage',
    referral_count INT NOT NULL DEFAULT 0,
    terms_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT chk_matchmaker_status CHECK (status IN ('active', 'suspended', 'inactive'))
);

CREATE INDEX IF NOT EXISTS idx_external_matchmakers_code ON public.external_matchmakers (code);
CREATE INDEX IF NOT EXISTS idx_external_matchmakers_status ON public.external_matchmakers (status);

-- Partner-Specific Agreement Terms
CREATE TABLE IF NOT EXISTS public.matchmaker_agreements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matchmaker_id UUID NOT NULL REFERENCES public.external_matchmakers(id) ON DELETE CASCADE,
    agreement_code VARCHAR(50) NOT NULL UNIQUE,
    fee_type VARCHAR(30) NOT NULL DEFAULT 'percentage',
    percentage_rate NUMERIC(5, 2) NULL,
    flat_fee_pkr NUMERIC(14, 0) NULL,
    effective_from DATE NOT NULL,
    effective_to DATE NULL,
    terms_text TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_matchmaker_agreements_mm ON public.matchmaker_agreements (matchmaker_id, is_active);

-- ------------------------------------------------------------------------------
-- 4. Matching, Human Decisions & Controlled Introductions
-- ------------------------------------------------------------------------------

-- Candidate Pair Context & Deduplication
CREATE TABLE IF NOT EXISTS public.match_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_code VARCHAR(30) NOT NULL UNIQUE,
    profile_a_id UUID NOT NULL REFERENCES public.profiles(id),
    profile_b_id UUID NOT NULL REFERENCES public.profiles(id),
    status VARCHAR(40) NOT NULL DEFAULT 'suggested',
    created_by UUID NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT chk_match_not_self CHECK (profile_a_id <> profile_b_id),
    CONSTRAINT uq_match_case_pair UNIQUE (profile_a_id, profile_b_id),
    CONSTRAINT chk_match_status CHECK (status IN ('suggested', 'approved_by_nadeem', 'shared_with_parties', 'accepted_by_customer', 'rejected', 'deferred'))
);

CREATE INDEX IF NOT EXISTS idx_match_cases_profiles ON public.match_cases (profile_a_id, profile_b_id);
CREATE INDEX IF NOT EXISTS idx_match_cases_status ON public.match_cases (status);

-- Deterministic Scoring Evaluation Results
CREATE TABLE IF NOT EXISTS public.match_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_case_id UUID NOT NULL REFERENCES public.match_cases(id) ON DELETE CASCADE,
    algorithm_version VARCHAR(50) NOT NULL DEFAULT 'v1.0.0-deterministic',
    compatibility_score INT NOT NULL,
    mandatory_satisfied BOOLEAN NOT NULL DEFAULT FALSE,
    criteria_breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
    evaluation_notes TEXT NULL,
    evaluated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT chk_eval_score CHECK (compatibility_score >= 0 AND compatibility_score <= 100)
);

CREATE INDEX IF NOT EXISTS idx_match_evaluations_case ON public.match_evaluations (match_case_id);

-- Matchmaker (Nadeem) Human Review Decisions
CREATE TABLE IF NOT EXISTS public.match_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_case_id UUID NOT NULL REFERENCES public.match_cases(id) ON DELETE CASCADE,
    decision VARCHAR(30) NOT NULL,
    decided_by UUID NULL,
    reason_code VARCHAR(100) NOT NULL,
    notes TEXT NULL,
    decided_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT chk_match_decision CHECK (decision IN ('approved', 'rejected', 'deferred'))
);

CREATE INDEX IF NOT EXISTS idx_match_decisions_case ON public.match_decisions (match_case_id, decided_at DESC);

-- Controlled Introductions & Share Grants (OPEN-006)
CREATE TABLE IF NOT EXISTS public.share_grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    recipient_type VARCHAR(30) NOT NULL DEFAULT 'customer',
    recipient_phone VARCHAR(50) NULL,
    approved_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
    expires_at TIMESTAMPTZ NOT NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    revoked_at TIMESTAMPTZ NULL,
    revoked_by UUID NULL,
    created_by UUID NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT chk_share_token_len CHECK (length(token_hash) = 64)
);

CREATE INDEX IF NOT EXISTS idx_share_grants_token_hash ON public.share_grants (token_hash);
CREATE INDEX IF NOT EXISTS idx_share_grants_profile ON public.share_grants (profile_id);
CREATE INDEX IF NOT EXISTS idx_share_grants_expiry ON public.share_grants (expires_at, is_revoked);

-- ------------------------------------------------------------------------------
-- 5. CRM & Operations
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.crm_follow_ups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_code VARCHAR(30) NOT NULL UNIQUE,
    profile_id UUID NULL REFERENCES public.profiles(id),
    match_case_id UUID NULL REFERENCES public.match_cases(id),
    target_type VARCHAR(30) NOT NULL DEFAULT 'profile',
    contact_person VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50) NOT NULL,
    follow_up_type VARCHAR(50) NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    scheduled_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    assigned_to UUID NULL,
    notes TEXT NULL,
    completed_at TIMESTAMPTZ NULL,
    completed_by UUID NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT chk_followup_status CHECK (status IN ('pending', 'completed', 'overdue', 'cancelled')),
    CONSTRAINT chk_followup_priority CHECK (priority IN ('low', 'medium', 'high', 'urgent'))
);

CREATE INDEX IF NOT EXISTS idx_crm_follow_ups_sched ON public.crm_follow_ups (scheduled_date, status);
CREATE INDEX IF NOT EXISTS idx_crm_follow_ups_profile ON public.crm_follow_ups (profile_id);
CREATE INDEX IF NOT EXISTS idx_crm_follow_ups_assigned ON public.crm_follow_ups (assigned_to);

-- ------------------------------------------------------------------------------
-- 6. Row-Level Security (RLS) Enablement & Execution Privileges
-- ------------------------------------------------------------------------------

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_siblings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_property_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_matchmakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matchmaker_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_follow_ups ENABLE ROW LEVEL SECURITY;

-- Revoke all execution from public and anon on all 14 tables
REVOKE ALL ON TABLE public.user_profiles FROM public, anon;
REVOKE ALL ON TABLE public.app_settings FROM public, anon;
REVOKE ALL ON TABLE public.profile_preferences FROM public, anon;
REVOKE ALL ON TABLE public.profile_siblings FROM public, anon;
REVOKE ALL ON TABLE public.profile_property_details FROM public, anon;
REVOKE ALL ON TABLE public.profile_photos FROM public, anon;
REVOKE ALL ON TABLE public.profile_status_history FROM public, anon;
REVOKE ALL ON TABLE public.external_matchmakers FROM public, anon;
REVOKE ALL ON TABLE public.matchmaker_agreements FROM public, anon;
REVOKE ALL ON TABLE public.match_cases FROM public, anon;
REVOKE ALL ON TABLE public.match_evaluations FROM public, anon;
REVOKE ALL ON TABLE public.match_decisions FROM public, anon;
REVOKE ALL ON TABLE public.share_grants FROM public, anon;
REVOKE ALL ON TABLE public.crm_follow_ups FROM public, anon;

-- Grant least-privilege operations to authenticated users
GRANT SELECT, UPDATE ON TABLE public.user_profiles TO authenticated;
GRANT SELECT ON TABLE public.app_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.profile_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profile_siblings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.profile_property_details TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.profile_photos TO authenticated;
GRANT SELECT, INSERT ON TABLE public.profile_status_history TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.external_matchmakers TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.matchmaker_agreements TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.match_cases TO authenticated;
GRANT SELECT, INSERT ON TABLE public.match_evaluations TO authenticated;
GRANT SELECT, INSERT ON TABLE public.match_decisions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.share_grants TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.crm_follow_ups TO authenticated;

-- Grant administrative full access to service_role
GRANT ALL ON TABLE public.user_profiles TO service_role;
GRANT ALL ON TABLE public.app_settings TO service_role;
GRANT ALL ON TABLE public.profile_preferences TO service_role;
GRANT ALL ON TABLE public.profile_siblings TO service_role;
GRANT ALL ON TABLE public.profile_property_details TO service_role;
GRANT ALL ON TABLE public.profile_photos TO service_role;
GRANT ALL ON TABLE public.profile_status_history TO service_role;
GRANT ALL ON TABLE public.external_matchmakers TO service_role;
GRANT ALL ON TABLE public.matchmaker_agreements TO service_role;
GRANT ALL ON TABLE public.match_cases TO service_role;
GRANT ALL ON TABLE public.match_evaluations TO service_role;
GRANT ALL ON TABLE public.match_decisions TO service_role;
GRANT ALL ON TABLE public.share_grants TO service_role;
GRANT ALL ON TABLE public.crm_follow_ups TO service_role;

-- ------------------------------------------------------------------------------
-- 7. Row-Level Security Policies
-- ------------------------------------------------------------------------------

-- [user_profiles]
CREATE POLICY user_profiles_own_select ON public.user_profiles
    FOR SELECT TO authenticated USING (id = auth.uid() OR public.auth_is_staff());

CREATE POLICY user_profiles_own_update ON public.user_profiles
    FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY user_profiles_admin_manage ON public.user_profiles
    FOR ALL TO authenticated USING (public.auth_has_role('admin'::public.app_role));

-- [app_settings]
CREATE POLICY app_settings_read ON public.app_settings
    FOR SELECT TO authenticated USING (true);

CREATE POLICY app_settings_admin_manage ON public.app_settings
    FOR ALL TO authenticated USING (public.auth_has_role('admin'::public.app_role));

-- [profile_preferences]
CREATE POLICY prefs_staff_select ON public.profile_preferences
    FOR SELECT TO authenticated USING (public.auth_is_staff());

CREATE POLICY prefs_customer_own_select ON public.profile_preferences
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.created_by = auth.uid()));

CREATE POLICY prefs_staff_manage ON public.profile_preferences
    FOR ALL TO authenticated USING (public.auth_is_staff()) WITH CHECK (public.auth_is_staff());

-- [profile_siblings]
CREATE POLICY siblings_staff_select ON public.profile_siblings
    FOR SELECT TO authenticated USING (public.auth_is_staff());

CREATE POLICY siblings_customer_own_select ON public.profile_siblings
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.created_by = auth.uid()));

CREATE POLICY siblings_staff_manage ON public.profile_siblings
    FOR ALL TO authenticated USING (public.auth_is_staff()) WITH CHECK (public.auth_is_staff());

-- [profile_property_details]
CREATE POLICY property_staff_select ON public.profile_property_details
    FOR SELECT TO authenticated USING (public.auth_is_staff());

CREATE POLICY property_customer_own_select ON public.profile_property_details
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.created_by = auth.uid()));

CREATE POLICY property_staff_manage ON public.profile_property_details
    FOR ALL TO authenticated USING (public.auth_is_staff()) WITH CHECK (public.auth_is_staff());

-- [profile_photos]
CREATE POLICY photos_staff_select ON public.profile_photos
    FOR SELECT TO authenticated USING (public.auth_is_staff());

CREATE POLICY photos_customer_own_select ON public.profile_photos
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.created_by = auth.uid()));

CREATE POLICY photos_staff_manage ON public.profile_photos
    FOR ALL TO authenticated USING (public.auth_is_staff()) WITH CHECK (public.auth_is_staff());

-- [profile_status_history] (Append-only)
CREATE POLICY status_history_staff_select ON public.profile_status_history
    FOR SELECT TO authenticated USING (public.auth_is_staff());

CREATE POLICY status_history_staff_insert ON public.profile_status_history
    FOR INSERT TO authenticated WITH CHECK (public.auth_is_staff());

-- [external_matchmakers & matchmaker_agreements]
CREATE POLICY matchmakers_staff_select ON public.external_matchmakers
    FOR SELECT TO authenticated USING (public.auth_is_staff());

CREATE POLICY matchmakers_staff_manage ON public.external_matchmakers
    FOR ALL TO authenticated USING (public.auth_is_staff()) WITH CHECK (public.auth_is_staff());

CREATE POLICY agreements_staff_select ON public.matchmaker_agreements
    FOR SELECT TO authenticated USING (public.auth_is_staff());

CREATE POLICY agreements_staff_manage ON public.matchmaker_agreements
    FOR ALL TO authenticated USING (public.auth_is_staff()) WITH CHECK (public.auth_is_staff());

-- [match_cases, evaluations & decisions]
CREATE POLICY match_cases_staff_select ON public.match_cases
    FOR SELECT TO authenticated USING (public.auth_is_staff());

CREATE POLICY match_cases_staff_manage ON public.match_cases
    FOR ALL TO authenticated USING (public.auth_is_staff()) WITH CHECK (public.auth_is_staff());

CREATE POLICY evaluations_staff_select ON public.match_evaluations
    FOR SELECT TO authenticated USING (public.auth_is_staff());

CREATE POLICY evaluations_staff_manage ON public.match_evaluations
    FOR ALL TO authenticated USING (public.auth_is_staff()) WITH CHECK (public.auth_is_staff());

CREATE POLICY decisions_staff_select ON public.match_decisions
    FOR SELECT TO authenticated USING (public.auth_is_staff());

CREATE POLICY decisions_staff_manage ON public.match_decisions
    FOR ALL TO authenticated USING (public.auth_is_staff()) WITH CHECK (public.auth_is_staff());

-- [share_grants]
CREATE POLICY share_grants_staff_select ON public.share_grants
    FOR SELECT TO authenticated USING (public.auth_is_staff());

CREATE POLICY share_grants_staff_manage ON public.share_grants
    FOR ALL TO authenticated USING (public.auth_is_staff()) WITH CHECK (public.auth_is_staff());

-- [crm_follow_ups]
CREATE POLICY follow_ups_staff_select ON public.crm_follow_ups
    FOR SELECT TO authenticated USING (public.auth_is_staff());

CREATE POLICY follow_ups_staff_manage ON public.crm_follow_ups
    FOR ALL TO authenticated USING (public.auth_is_staff()) WITH CHECK (public.auth_is_staff());

COMMIT;
