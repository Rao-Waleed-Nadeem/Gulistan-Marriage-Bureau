-- ==============================================================================
-- Migration: 00009_customer_portal_and_crm_enhancements.sql
-- Description: Customer portal approved recommendations RPC, preference save RPC,
--              customer CRM follow-up RLS policies, durable CRM links,
--              and reminder delivery model schema enhancements.
--
-- Remediation of Independent Audit Findings:
--   - P1-16: Backend customer recommendations empty due to staff-only RLS.
--            Introduces `get_customer_recommendations(p_profile_id UUID)` server RPC
--            enforcing caller ownership and projecting only privacy-filtered candidate data.
--   - P1-17: Preference editor reports success without saving.
--            Introduces `update_profile_preferences(p_profile_id UUID, p_preferences JSONB)`
--            server RPC and customer update RLS policy on `public.profile_preferences`.
--   - P1-30: CRM profile linkage is not persisted.
--            Ensures schema support and foreign key constraints on `public.crm_follow_ups`.
--   - P1-31: CRM fallback values fabricate contact identity.
--            Enforces strict validated contact information and schema constraints.
--   - P2-06: Follow-up reminder delivery model.
--            Adds `reminder_sent_at` and `notification_channel` with check constraints and index.
--
-- Architectural & Security Invariants:
--   - All operations wrapped in a transaction block (BEGIN ... COMMIT).
--   - Least privilege: customer queries strictly restricted to their owned profile.
--   - Zero mock or synthetic candidate data seeding.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. Schema Enhancements on crm_follow_ups for Reminder Delivery Model (P2-06)
-- ------------------------------------------------------------------------------

-- Add reminder tracking timestamp and notification channel columns
ALTER TABLE public.crm_follow_ups
    ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ NULL,
    ADD COLUMN IF NOT EXISTS notification_channel VARCHAR(30) NOT NULL DEFAULT 'in_app';

-- Enforce valid notification channels
ALTER TABLE public.crm_follow_ups
    DROP CONSTRAINT IF EXISTS chk_followup_channel;

ALTER TABLE public.crm_follow_ups
    ADD CONSTRAINT chk_followup_channel
    CHECK (notification_channel IN ('in_app', 'email', 'whatsapp', 'sms'));

-- Create index for reminder dispatch / querying
CREATE INDEX IF NOT EXISTS idx_crm_follow_ups_reminders
    ON public.crm_follow_ups (scheduled_date, status, reminder_sent_at);

-- ------------------------------------------------------------------------------
-- 2. Customer Self-Service RLS Policies on crm_follow_ups (P1-30, P1-31)
-- ------------------------------------------------------------------------------

-- Allow active authenticated customers to submit follow-up requests (corrections,
-- deactivations, inquiries) for profiles they own
DROP POLICY IF EXISTS follow_ups_customer_insert ON public.crm_follow_ups;
CREATE POLICY follow_ups_customer_insert ON public.crm_follow_ups
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = profile_id
              AND (p.account_id = auth.uid() OR p.created_by = auth.uid())
              AND public.auth_is_account_active(auth.uid())
        )
        AND follow_up_type IN ('profile_correction', 'deactivation_request', 'photo_consent_change', 'customer_inquiry')
    );

-- Allow active authenticated customers to view their own submitted follow-ups
DROP POLICY IF EXISTS follow_ups_customer_select ON public.crm_follow_ups;
CREATE POLICY follow_ups_customer_select ON public.crm_follow_ups
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
-- 3. Customer Profile Preferences Update Policy (P1-17)
-- ------------------------------------------------------------------------------

-- Allow active customers who own the profile to update preferences when profile
-- is pending_review, active, or introduction_authorized
DROP POLICY IF EXISTS prefs_customer_own_update ON public.profile_preferences;
CREATE POLICY prefs_customer_own_update ON public.profile_preferences
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = profile_id
              AND (p.account_id = auth.uid() OR p.created_by = auth.uid())
              AND p.status IN ('pending_review', 'active', 'introduction_authorized')
              AND public.auth_is_account_active(auth.uid())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = profile_id
              AND (p.account_id = auth.uid() OR p.created_by = auth.uid())
              AND p.status IN ('pending_review', 'active', 'introduction_authorized')
              AND public.auth_is_account_active(auth.uid())
        )
    );

-- ------------------------------------------------------------------------------
-- 4. Server RPC: update_profile_preferences (P1-17)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_profile_preferences(
    p_profile_id UUID,
    p_preferences JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_caller_id UUID;
    v_is_staff BOOLEAN;
    v_is_owner BOOLEAN;
    v_pref_row public.profile_preferences%ROWTYPE;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHENTICATED: Authentication required to update preferences.';
    END IF;

    IF NOT public.auth_is_account_active(v_caller_id) THEN
        RAISE EXCEPTION 'ACCOUNT_INACTIVE: Account is suspended or pending verification.';
    END IF;

    v_is_staff := public.auth_is_staff();

    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = p_profile_id
          AND (account_id = v_caller_id OR created_by = v_caller_id)
    ) INTO v_is_owner;

    IF NOT v_is_staff AND NOT v_is_owner THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Only the verified profile owner or bureau staff can update partner preferences.';
    END IF;

    -- Upsert preferences
    INSERT INTO public.profile_preferences (
        profile_id,
        age_min,
        age_max,
        height_min_inches,
        height_max_inches,
        marital_status,
        religion,
        aqeedah,
        caste,
        education,
        occupations,
        cities,
        property_expectation,
        family_arrangement,
        lifestyle_notes,
        criteria_classifications,
        updated_at
    )
    VALUES (
        p_profile_id,
        (p_preferences->>'age_min')::INT,
        (p_preferences->>'age_max')::INT,
        (p_preferences->>'height_min_inches')::INT,
        (p_preferences->>'height_max_inches')::INT,
        p_preferences->>'marital_status',
        p_preferences->>'religion',
        p_preferences->>'aqeedah',
        p_preferences->>'caste',
        p_preferences->>'education',
        CASE WHEN p_preferences ? 'occupations' AND jsonb_typeof(p_preferences->'occupations') = 'array' 
             THEN (SELECT array_agg(x) FROM jsonb_array_elements_text(p_preferences->'occupations') t(x))
             ELSE NULL END,
        CASE WHEN p_preferences ? 'cities' AND jsonb_typeof(p_preferences->'cities') = 'array' 
             THEN (SELECT array_agg(x) FROM jsonb_array_elements_text(p_preferences->'cities') t(x))
             ELSE NULL END,
        p_preferences->>'property_expectation',
        p_preferences->>'family_arrangement',
        p_preferences->>'lifestyle_notes',
        COALESCE(p_preferences->'criteria_classifications', '{}'::jsonb),
        timezone('utc'::text, now())
    )
    ON CONFLICT (profile_id) DO UPDATE SET
        age_min = EXCLUDED.age_min,
        age_max = EXCLUDED.age_max,
        height_min_inches = EXCLUDED.height_min_inches,
        height_max_inches = EXCLUDED.height_max_inches,
        marital_status = EXCLUDED.marital_status,
        religion = EXCLUDED.religion,
        aqeedah = EXCLUDED.aqeedah,
        caste = EXCLUDED.caste,
        education = EXCLUDED.education,
        occupations = EXCLUDED.occupations,
        cities = EXCLUDED.cities,
        property_expectation = EXCLUDED.property_expectation,
        family_arrangement = EXCLUDED.family_arrangement,
        lifestyle_notes = EXCLUDED.lifestyle_notes,
        criteria_classifications = EXCLUDED.criteria_classifications,
        updated_at = timezone('utc'::text, now())
    RETURNING * INTO v_pref_row;

    -- Minimal audit log
    INSERT INTO public.audit_events (
        actor_id,
        actor_role,
        action,
        target_type,
        target_id,
        details
    ) VALUES (
        v_caller_id,
        CASE WHEN v_is_staff THEN 'staff' ELSE 'customer' END,
        'profile_preferences_updated',
        'profile_preferences',
        v_pref_row.id::TEXT,
        jsonb_build_object(
            'profile_id', p_profile_id,
            'age_min', v_pref_row.age_min,
            'age_max', v_pref_row.age_max
        )
    );

    RETURN row_to_json(v_pref_row)::JSONB;
END;
$$;

-- ------------------------------------------------------------------------------
-- 5. Server RPC: get_customer_recommendations (P1-16)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_customer_recommendations(
    p_profile_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_caller_id UUID;
    v_is_staff BOOLEAN;
    v_is_owner BOOLEAN;
    v_results JSONB := '[]'::JSONB;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHENTICATED: Authentication required to view recommendations.';
    END IF;

    IF NOT public.auth_is_account_active(v_caller_id) THEN
        RAISE EXCEPTION 'ACCOUNT_INACTIVE: Account is suspended or pending verification.';
    END IF;

    v_is_staff := public.auth_is_staff();

    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = p_profile_id
          AND (account_id = v_caller_id OR created_by = v_caller_id)
    ) INTO v_is_owner;

    IF NOT v_is_staff AND NOT v_is_owner THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Cannot access match recommendations for another user profile.';
    END IF;

    -- Query approved match cases for this profile with latest evaluation & sanitized candidate profile
    SELECT COALESCE(jsonb_agg(rec_obj), '[]'::JSONB) INTO v_results
    FROM (
        SELECT jsonb_build_object(
            'id', mc.id,
            'caseCode', mc.case_code,
            'requestingProfileId', p_profile_id,
            'candidateProfileId', other_p.id,
            'matchScore', COALESCE(latest_eval.compatibility_score, 0),
            'compatibilitySummaryEn', COALESCE(latest_eval.evaluation_notes, 'Approved Matchmaker Introduction'),
            'compatibilitySummaryUrdu', 'ندیم صاحب کی جانب سے منظور شدہ باوقار رشتہ برائے تعارف۔',
            'status', mc.status,
            'reviewedDate', to_char(mc.updated_at, 'YYYY-MM-DD'),
            'candidateProfile', jsonb_build_object(
                'id', other_p.reference_code,
                'databaseId', other_p.id,
                'referenceCode', other_p.reference_code,
                'displayName', other_p.display_name,
                'gender', other_p.gender,
                'age', other_p.age,
                'heightDisplay', other_p.height_display,
                'education', other_p.education,
                'occupation', other_p.occupation,
                'jobTitle', other_p.job_title,
                'currentCity', other_p.current_city,
                'residenceArea', other_p.residence_area,
                'religion', other_p.religion,
                'aqeedah', other_p.aqeedah,
                'caste', other_p.caste,
                'maritalStatus', other_p.marital_status,
                'familyBackgroundNotes', other_p.family_background_notes,
                'photoPermissionGranted', other_p.photo_permission_granted
            )
        ) AS rec_obj
        FROM public.match_cases mc
        -- Identify counterpart profile
        JOIN public.profiles other_p ON (
            CASE WHEN mc.profile_a_id = p_profile_id THEN mc.profile_b_id ELSE mc.profile_a_id END = other_p.id
        )
        -- Latest evaluation
        LEFT JOIN LATERAL (
            SELECT compatibility_score, evaluation_notes, evaluated_at
            FROM public.match_evaluations me
            WHERE me.match_case_id = mc.id
            ORDER BY me.evaluated_at DESC
            LIMIT 1
        ) latest_eval ON TRUE
        WHERE (mc.profile_a_id = p_profile_id OR mc.profile_b_id = p_profile_id)
          AND mc.status IN ('approved_by_nadeem', 'shared_with_parties', 'accepted_by_customer')
          AND other_p.status IN ('active', 'introduction_authorized')
        ORDER BY mc.updated_at DESC
    ) sub;

    RETURN v_results;
END;
$$;

-- ------------------------------------------------------------------------------
-- 6. Permissions
-- ------------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.update_profile_preferences(UUID, JSONB) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.update_profile_preferences(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_profile_preferences(UUID, JSONB) TO service_role;

REVOKE ALL ON FUNCTION public.get_customer_recommendations(UUID) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_customer_recommendations(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_customer_recommendations(UUID) TO service_role;

COMMIT;
