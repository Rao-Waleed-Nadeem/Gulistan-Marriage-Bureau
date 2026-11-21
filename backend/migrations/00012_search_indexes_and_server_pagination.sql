-- ==============================================================================
-- Migration: 00012_search_indexes_and_server_pagination.sql
-- Description: Composite search indexes, keyset pagination index, and atomic
-- server RPC search_profiles_paginated with bounded payloads for 100k scale.
-- Task: T-039 (Remediation of Findings OPS-05 and P1-19)
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. Composite Search and Keyset Pagination Indexes
-- ------------------------------------------------------------------------------

-- Composite B-tree index for primary multi-attribute demographic search
-- Matches the core candidate filter: (gender, status, religion, aqeedah, marital_status, age)
CREATE INDEX IF NOT EXISTS idx_profiles_search_composite 
    ON public.profiles (gender, status, religion, aqeedah, marital_status, age);

-- Composite B-tree index for Pakistani city and caste localization
CREATE INDEX IF NOT EXISTS idx_profiles_city_caste 
    ON public.profiles (current_city, caste);

-- Composite B-tree index for status and reverse chronological ordering
CREATE INDEX IF NOT EXISTS idx_profiles_status_created 
    ON public.profiles (status, created_at DESC, id);

-- Composite B-tree index for keyset / cursor-based pagination
CREATE INDEX IF NOT EXISTS idx_profiles_keyset_pagination 
    ON public.profiles (created_at DESC, id);

-- Composite B-tree index for common location, gender and age bounds
CREATE INDEX IF NOT EXISTS idx_profiles_location_gender_age 
    ON public.profiles (current_city, gender, age);


-- ------------------------------------------------------------------------------
-- 2. Server-Side RPC: search_profiles_paginated
-- ------------------------------------------------------------------------------
-- Delivers bounded, sanitized candidate profiles with server-side pagination,
-- exact/windowed total counts, next-cursor emission, and a hard upper bound
-- of 100 records per page (default: 20) to eliminate whole-registry browser blowups.
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.search_profiles_paginated(
    p_status VARCHAR DEFAULT NULL,
    p_gender VARCHAR DEFAULT NULL,
    p_city TEXT DEFAULT NULL,
    p_caste TEXT DEFAULT NULL,
    p_min_age INT DEFAULT NULL,
    p_max_age INT DEFAULT NULL,
    p_marital_status VARCHAR DEFAULT NULL,
    p_limit INT DEFAULT 20,
    p_offset INT DEFAULT 0,
    p_cursor_created_at TIMESTAMPTZ DEFAULT NULL,
    p_cursor_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_effective_limit INT;
    v_total_count BIGINT;
    v_items JSONB;
    v_has_more BOOLEAN := FALSE;
    v_next_cursor JSONB := NULL;
    v_caller_role VARCHAR;
    v_is_staff BOOLEAN;
BEGIN
    -- Verify caller authentication or determine staff status
    v_is_staff := public.auth_is_staff();

    -- Enforce strict page size boundaries: minimum 1, maximum 100 (default 20)
    v_effective_limit := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100);

    -- Compute total matching record count
    SELECT COUNT(*)
    INTO v_total_count
    FROM public.profiles p
    WHERE (p_status IS NULL OR p.status = p_status)
      AND (p_gender IS NULL OR p.gender = p_gender)
      AND (p_city IS NULL OR p.current_city ILIKE '%' || p_city || '%')
      AND (p_caste IS NULL OR p.caste ILIKE '%' || p_caste || '%')
      AND (p_min_age IS NULL OR p.age >= p_min_age)
      AND (p_max_age IS NULL OR p.age <= p_max_age)
      AND (p_marital_status IS NULL OR p.marital_status = p_marital_status)
      -- Non-staff callers may only discover active or introduction-authorized profiles
      AND (v_is_staff OR p.status IN ('active', 'introduction_authorized'));

    -- Keyset / Cursor Pagination takes precedence if valid cursor provided
    IF p_cursor_created_at IS NOT NULL AND p_cursor_id IS NOT NULL THEN
        SELECT COALESCE(jsonb_agg(sub.profile_item), '[]'::jsonb)
        INTO v_items
        FROM (
            SELECT jsonb_build_object(
                'id', p.id,
                'reference_code', p.reference_code,
                'full_name', CASE 
                    WHEN v_is_staff THEN p.full_name 
                    ELSE 'Candidate ' || SUBSTRING(p.reference_code FROM 5) 
                END,
                'gender', p.gender,
                'age', p.age,
                'marital_status', p.marital_status,
                'religion', p.religion,
                'aqeedah', p.aqeedah,
                'caste', p.caste,
                'current_city', p.current_city,
                'education', p.education,
                'occupation', p.occupation,
                'monthly_income_pkr', CASE 
                    WHEN v_is_staff THEN p.monthly_income_pkr 
                    ELSE NULL 
                END,
                'status', p.status,
                'created_at', p.created_at,
                'photo_storage_path', (
                    SELECT ph.storage_path
                    FROM public.profile_photos ph
                    WHERE ph.profile_id = p.id AND ph.is_primary = TRUE
                    LIMIT 1
                )
            ) AS profile_item,
            p.created_at,
            p.id
            FROM public.profiles p
            WHERE (p_status IS NULL OR p.status = p_status)
              AND (p_gender IS NULL OR p.gender = p_gender)
              AND (p_city IS NULL OR p.current_city ILIKE '%' || p_city || '%')
              AND (p_caste IS NULL OR p.caste ILIKE '%' || p_caste || '%')
              AND (p_min_age IS NULL OR p.age >= p_min_age)
              AND (p_max_age IS NULL OR p.age <= p_max_age)
              AND (p_marital_status IS NULL OR p.marital_status = p_marital_status)
              AND (v_is_staff OR p.status IN ('active', 'introduction_authorized'))
              AND (p.created_at < p_cursor_created_at OR (p.created_at = p_cursor_created_at AND p.id < p_cursor_id))
            ORDER BY p.created_at DESC, p.id DESC
            LIMIT v_effective_limit + 1
        ) sub;
    ELSE
        -- Offset-based Pagination
        SELECT COALESCE(jsonb_agg(sub.profile_item), '[]'::jsonb)
        INTO v_items
        FROM (
            SELECT jsonb_build_object(
                'id', p.id,
                'reference_code', p.reference_code,
                'full_name', CASE 
                    WHEN v_is_staff THEN p.full_name 
                    ELSE 'Candidate ' || SUBSTRING(p.reference_code FROM 5) 
                END,
                'gender', p.gender,
                'age', p.age,
                'marital_status', p.marital_status,
                'religion', p.religion,
                'aqeedah', p.aqeedah,
                'caste', p.caste,
                'current_city', p.current_city,
                'education', p.education,
                'occupation', p.occupation,
                'monthly_income_pkr', CASE 
                    WHEN v_is_staff THEN p.monthly_income_pkr 
                    ELSE NULL 
                END,
                'status', p.status,
                'created_at', p.created_at,
                'photo_storage_path', (
                    SELECT ph.storage_path
                    FROM public.profile_photos ph
                    WHERE ph.profile_id = p.id AND ph.is_primary = TRUE
                    LIMIT 1
                )
            ) AS profile_item,
            p.created_at,
            p.id
            FROM public.profiles p
            WHERE (p_status IS NULL OR p.status = p_status)
              AND (p_gender IS NULL OR p.gender = p_gender)
              AND (p_city IS NULL OR p.current_city ILIKE '%' || p_city || '%')
              AND (p_caste IS NULL OR p.caste ILIKE '%' || p_caste || '%')
              AND (p_min_age IS NULL OR p.age >= p_min_age)
              AND (p_max_age IS NULL OR p.age <= p_max_age)
              AND (p_marital_status IS NULL OR p.marital_status = p_marital_status)
              AND (v_is_staff OR p.status IN ('active', 'introduction_authorized'))
            ORDER BY p.created_at DESC, p.id DESC
            LIMIT v_effective_limit + 1
            OFFSET GREATEST(COALESCE(p_offset, 0), 0)
        ) sub;
    END IF;

    -- Determine if there is a next page
    IF jsonb_array_length(v_items) > v_effective_limit THEN
        v_has_more := TRUE;
        -- Trim items back to exactly v_effective_limit elements
        v_items := (
            SELECT jsonb_agg(elem)
            FROM (
                SELECT elem
                FROM jsonb_array_elements(v_items) WITH ORDINALITY AS arr(elem, idx)
                WHERE idx <= v_effective_limit
            ) s
        );
    END IF;

    -- Extract cursor from last element if items are non-empty
    IF jsonb_array_length(v_items) > 0 THEN
        v_next_cursor := jsonb_build_object(
            'created_at', (v_items->(jsonb_array_length(v_items) - 1)->>'created_at'),
            'id', (v_items->(jsonb_array_length(v_items) - 1)->>'id')
        );
    END IF;

    RETURN jsonb_build_object(
        'items', v_items,
        'total_count', v_total_count,
        'limit', v_effective_limit,
        'offset', GREATEST(COALESCE(p_offset, 0), 0),
        'has_more', v_has_more,
        'next_cursor', v_next_cursor
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. Permissions & Grants (Least Privilege)
-- ------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.search_profiles_paginated(
    VARCHAR, VARCHAR, TEXT, TEXT, INT, INT, VARCHAR, INT, INT, TIMESTAMPTZ, UUID
) FROM public, anon;

GRANT EXECUTE ON FUNCTION public.search_profiles_paginated(
    VARCHAR, VARCHAR, TEXT, TEXT, INT, INT, VARCHAR, INT, INT, TIMESTAMPTZ, UUID
) TO authenticated, service_role;

COMMIT;
