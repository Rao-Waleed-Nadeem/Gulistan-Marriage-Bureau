-- ==============================================================================
-- Gulistan Marriage Bureau — Migration 00006: Profile Intake and Ownership Enhancements
-- ==============================================================================
-- Architectural & Security Invariants:
--   - Remediation of Independent Audit Findings:
--       * P0-03 & P0-15: Customer profile ownership and child table RLS policies
--         (preferences, siblings, property) for customer self-service intake.
--       * P1-10: Lossless nested DTO mapping support for profile child tables.
--       * P1-11 & P1-12: Full persistence of preferences, property, and siblings.
--       * P1-13: Single transactional intake function `create_profile_bundle`
--         guaranteeing atomic writes across parent and child tables.
--       * P1-14: Collision-resistant reference code generator support.
--   - Safe, additive migration: wraps all DDL in a transaction block (BEGIN ... COMMIT)
--   - No mock or synthetic candidate data seeding
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. Customer Child Table Policies (P0-03, P0-15)
-- ------------------------------------------------------------------------------
-- Allow customers to select, insert, and update child entities for profiles
-- they own (via account_id or created_by) while in 'pending_review' status.

-- [profile_preferences]
DROP POLICY IF EXISTS prefs_customer_own_select ON public.profile_preferences;
CREATE POLICY prefs_customer_own_select ON public.profile_preferences
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = profile_id
              AND (p.account_id = auth.uid() OR p.created_by = auth.uid())
              AND public.auth_is_account_active(auth.uid())
        )
    );

DROP POLICY IF EXISTS prefs_customer_own_insert ON public.profile_preferences;
CREATE POLICY prefs_customer_own_insert ON public.profile_preferences
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = profile_id
              AND (p.account_id = auth.uid() OR p.created_by = auth.uid())
              AND p.status = 'pending_review'
              AND public.auth_is_account_active(auth.uid())
        )
    );

DROP POLICY IF EXISTS prefs_customer_own_update ON public.profile_preferences;
CREATE POLICY prefs_customer_own_update ON public.profile_preferences
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = profile_id
              AND (p.account_id = auth.uid() OR p.created_by = auth.uid())
              AND p.status = 'pending_review'
              AND public.auth_is_account_active(auth.uid())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = profile_id
              AND (p.account_id = auth.uid() OR p.created_by = auth.uid())
              AND p.status = 'pending_review'
              AND public.auth_is_account_active(auth.uid())
        )
    );

-- [profile_siblings]
DROP POLICY IF EXISTS siblings_customer_own_select ON public.profile_siblings;
CREATE POLICY siblings_customer_own_select ON public.profile_siblings
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = profile_id
              AND (p.account_id = auth.uid() OR p.created_by = auth.uid())
              AND public.auth_is_account_active(auth.uid())
        )
    );

DROP POLICY IF EXISTS siblings_customer_own_insert ON public.profile_siblings;
CREATE POLICY siblings_customer_own_insert ON public.profile_siblings
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = profile_id
              AND (p.account_id = auth.uid() OR p.created_by = auth.uid())
              AND p.status = 'pending_review'
              AND public.auth_is_account_active(auth.uid())
        )
    );

DROP POLICY IF EXISTS siblings_customer_own_update ON public.profile_siblings;
CREATE POLICY siblings_customer_own_update ON public.profile_siblings
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = profile_id
              AND (p.account_id = auth.uid() OR p.created_by = auth.uid())
              AND p.status = 'pending_review'
              AND public.auth_is_account_active(auth.uid())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = profile_id
              AND (p.account_id = auth.uid() OR p.created_by = auth.uid())
              AND p.status = 'pending_review'
              AND public.auth_is_account_active(auth.uid())
        )
    );

-- [profile_property_details]
DROP POLICY IF EXISTS property_customer_own_select ON public.profile_property_details;
CREATE POLICY property_customer_own_select ON public.profile_property_details
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = profile_id
              AND (p.account_id = auth.uid() OR p.created_by = auth.uid())
              AND public.auth_is_account_active(auth.uid())
        )
    );

DROP POLICY IF EXISTS property_customer_own_insert ON public.profile_property_details;
CREATE POLICY property_customer_own_insert ON public.profile_property_details
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = profile_id
              AND (p.account_id = auth.uid() OR p.created_by = auth.uid())
              AND p.status = 'pending_review'
              AND public.auth_is_account_active(auth.uid())
        )
    );

DROP POLICY IF EXISTS property_customer_own_update ON public.profile_property_details;
CREATE POLICY property_customer_own_update ON public.profile_property_details
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = profile_id
              AND (p.account_id = auth.uid() OR p.created_by = auth.uid())
              AND p.status = 'pending_review'
              AND public.auth_is_account_active(auth.uid())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = profile_id
              AND (p.account_id = auth.uid() OR p.created_by = auth.uid())
              AND p.status = 'pending_review'
              AND public.auth_is_account_active(auth.uid())
        )
    );

-- ------------------------------------------------------------------------------
-- 2. Transactional Profile Bundle Creation RPC (P1-13)
-- ------------------------------------------------------------------------------
-- Creates a candidate profile and its associated preferences, property, and
-- siblings inside an atomic database transaction. If any child table write fails,
-- PostgreSQL automatically rolls back the entire operation.
CREATE OR REPLACE FUNCTION public.create_profile_bundle(
    p_profile jsonb,
    p_preferences jsonb DEFAULT NULL,
    p_property jsonb DEFAULT NULL,
    p_siblings jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_caller_id UUID;
    v_is_staff BOOLEAN;
    v_account_id UUID;
    v_created_by UUID;
    v_status VARCHAR(40);
    v_source VARCHAR(40);
    v_ref_code VARCHAR(20);
    v_profile_id UUID;
    v_profile_row public.profiles%ROWTYPE;
    v_pref_row public.profile_preferences%ROWTYPE;
    v_prop_row public.profile_property_details%ROWTYPE;
    v_sib_elem jsonb;
    v_siblings_res jsonb := '[]'::jsonb;
    v_result jsonb;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHENTICATED: Authentication required to create candidate profiles.';
    END IF;

    IF NOT public.auth_is_account_active(v_caller_id) THEN
        RAISE EXCEPTION 'ACCOUNT_INACTIVE: User account is suspended or pending verification.';
    END IF;

    v_is_staff := public.auth_is_staff();

    IF v_is_staff THEN
        v_account_id := (p_profile->>'account_id')::UUID;
        v_created_by := v_caller_id;
        v_status := COALESCE(p_profile->>'status', 'pending_review');
        v_source := COALESCE(p_profile->>'source', 'walk_in');
    ELSE
        -- Customer Self-Service Invariants (P0-03, P0-15)
        v_account_id := v_caller_id;
        v_created_by := v_caller_id;
        v_status := 'pending_review';
        v_source := 'direct_web';
    END IF;

    -- Reference code resolution (P1-14)
    v_ref_code := NULLIF(TRIM(p_profile->>'reference_code'), '');
    IF v_ref_code IS NULL THEN
        v_ref_code := 'GLS-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));
    END IF;

    -- Insert Parent Profile
    INSERT INTO public.profiles (
        reference_code,
        full_name,
        display_name,
        gender,
        age,
        dob,
        height_inches,
        height_display,
        marital_status,
        religion,
        aqeedah,
        caste,
        sub_caste,
        education_level,
        education_field,
        occupation,
        job_title,
        company_or_sector,
        monthly_income_pkr,
        hometown,
        current_city,
        residence_area,
        status,
        source,
        assigned_matchmaker_id,
        contact_person,
        contact_phone,
        contact_email,
        preferred_contact_method,
        photo_permission_granted,
        representative_consent_certified,
        internal_notes,
        created_by,
        account_id
    ) VALUES (
        v_ref_code,
        p_profile->>'full_name',
        COALESCE(p_profile->>'display_name', p_profile->>'full_name'),
        p_profile->>'gender',
        (p_profile->>'age')::INT,
        (p_profile->>'dob')::DATE,
        (p_profile->>'height_inches')::INT,
        p_profile->>'height_display',
        p_profile->>'marital_status',
        COALESCE(p_profile->>'religion', 'Islam'),
        p_profile->>'aqeedah',
        p_profile->>'caste',
        p_profile->>'sub_caste',
        p_profile->>'education_level',
        p_profile->>'education_field',
        p_profile->>'occupation',
        p_profile->>'job_title',
        p_profile->>'company_or_sector',
        (p_profile->>'monthly_income_pkr')::NUMERIC,
        p_profile->>'hometown',
        p_profile->>'current_city',
        p_profile->>'residence_area',
        v_status,
        v_source,
        (p_profile->>'assigned_matchmaker_id')::UUID,
        COALESCE(p_profile->>'contact_person', p_profile->>'full_name'),
        p_profile->>'contact_phone',
        p_profile->>'contact_email',
        COALESCE(p_profile->>'preferred_contact_method', 'whatsapp'),
        COALESCE((p_profile->>'photo_permission_granted')::BOOLEAN, FALSE),
        COALESCE((p_profile->>'representative_consent_certified')::BOOLEAN, FALSE),
        CASE WHEN v_is_staff THEN p_profile->>'internal_notes' ELSE NULL END,
        v_created_by,
        v_account_id
    )
    RETURNING * INTO v_profile_row;

    v_profile_id := v_profile_row.id;

    -- Insert Preferences (lossless mapping per P1-10, P1-11)
    IF p_preferences IS NOT NULL AND p_preferences != '{}'::jsonb THEN
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
            criteria_classifications
        ) VALUES (
            v_profile_id,
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
            COALESCE(p_preferences->'criteria_classifications', '{}'::jsonb)
        )
        RETURNING * INTO v_pref_row;
    END IF;

    -- Insert Property Details (P1-09, P1-12)
    IF p_property IS NOT NULL AND p_property != '{}'::jsonb AND (p_property->>'area_marlas')::NUMERIC >= 0 THEN
        INSERT INTO public.profile_property_details (
            profile_id,
            ownership,
            property_type,
            area_marlas,
            area_kanal_display,
            approx_value_pkr,
            city,
            locality,
            household_arrangement
        ) VALUES (
            v_profile_id,
            COALESCE(p_property->>'ownership', 'owned'),
            COALESCE(p_property->>'property_type', 'house'),
            COALESCE((p_property->>'area_marlas')::NUMERIC, 0),
            p_property->>'area_kanal_display',
            (p_property->>'approx_value_pkr')::NUMERIC,
            COALESCE(p_property->>'city', v_profile_row.current_city),
            COALESCE(p_property->>'locality', v_profile_row.residence_area),
            COALESCE(p_property->>'household_arrangement', 'independent')
        )
        RETURNING * INTO v_prop_row;
    END IF;

    -- Insert Siblings (P1-12)
    IF p_siblings IS NOT NULL AND jsonb_typeof(p_siblings) = 'array' AND jsonb_array_length(p_siblings) > 0 THEN
        FOR v_sib_elem IN SELECT * FROM jsonb_array_elements(p_siblings)
        LOOP
            INSERT INTO public.profile_siblings (
                profile_id,
                relation,
                name,
                gender,
                age,
                marital_status,
                occupation,
                education,
                marriage_details,
                spouse_family_details,
                children_count
            ) VALUES (
                v_profile_id,
                v_sib_elem->>'relation',
                v_sib_elem->>'name',
                CASE WHEN (v_sib_elem->>'relation') = 'brother' THEN 'male' ELSE 'female' END,
                (v_sib_elem->>'age')::INT,
                v_sib_elem->>'marital_status',
                v_sib_elem->>'occupation',
                v_sib_elem->>'education',
                v_sib_elem->>'marriage_details',
                v_sib_elem->>'spouse_family_details',
                COALESCE((v_sib_elem->>'children_count')::INT, 0)
            );
        END LOOP;

        SELECT jsonb_agg(row_to_json(s)) INTO v_siblings_res
        FROM public.profile_siblings s
        WHERE s.profile_id = v_profile_id;
    END IF;

    -- Assemble return JSON bundle
    v_result := jsonb_build_object(
        'profile', row_to_json(v_profile_row),
        'preferences', CASE WHEN v_pref_row.id IS NOT NULL THEN row_to_json(v_pref_row) ELSE NULL END,
        'property', CASE WHEN v_prop_row.id IS NOT NULL THEN row_to_json(v_prop_row) ELSE NULL END,
        'siblings', v_siblings_res
    );

    RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.create_profile_bundle(jsonb, jsonb, jsonb, jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_profile_bundle(jsonb, jsonb, jsonb, jsonb) TO authenticated;

COMMIT;
