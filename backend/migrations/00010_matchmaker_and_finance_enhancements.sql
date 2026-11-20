-- ==============================================================================
-- Gulistan Marriage Bureau — Migration 00010: Matchmaker Agreements & Finance Enhancements
-- ==============================================================================
-- Architectural Scope (T-037 / Findings P1-32 through P1-38):
--   1. Matchmaker Agreements: Add structured tiered_rules JSONB column (P1-33).
--   2. Referral Attributions: Provision durable referral_attributions table with
--      foreign keys to external_matchmakers and profiles, unique constraint on
--      (matchmaker_id, profile_id), indexes, and RLS policies (P1-34).
--   3. Atomic Referral Attribution RPC: attribute_profile_referral validates
--      partner status and updates referral count deterministically (P1-34).
--   4. Financial Reversal Integrity: Add unique partial index on reversal_of to
--      prevent duplicate reversals at the database level (P1-36).
--   5. Atomic Financial Reversal RPC: record_financial_reversal locks target row,
--      verifies non-reversed status, sets status = 'reversed', and appends reversal (P1-35, P1-36).
--   6. Transaction Type & Status Integrity: Enforce valid type/status combinations (P1-37).
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. Tiered Partner Commission Schema (P1-33)
-- ------------------------------------------------------------------------------

ALTER TABLE public.matchmaker_agreements
    ADD COLUMN IF NOT EXISTS tiered_rules JSONB NULL;

COMMENT ON COLUMN public.matchmaker_agreements.tiered_rules IS
    'Structured tiers for progressive commissions (e.g., [{"minMatches": 1, "maxMatches": 5, "ratePercent": 15}, {"minMatches": 6, "maxMatches": null, "ratePercent": 20}]).';

-- ------------------------------------------------------------------------------
-- 2. Referral Attributions Table & Security Policies (P1-34)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.referral_attributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matchmaker_id UUID NOT NULL REFERENCES public.external_matchmakers(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    referral_source VARCHAR(50) NOT NULL DEFAULT 'external_partner',
    attributed_by UUID NULL,
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    -- Idempotency and Deduplication: each partner-candidate referral pair is unique
    CONSTRAINT uq_referral_partner_profile UNIQUE (matchmaker_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_referral_attributions_mm
    ON public.referral_attributions (matchmaker_id);

CREATE INDEX IF NOT EXISTS idx_referral_attributions_profile
    ON public.referral_attributions (profile_id);

CREATE INDEX IF NOT EXISTS idx_referral_attributions_created
    ON public.referral_attributions (created_at DESC);

-- Enable RLS
ALTER TABLE public.referral_attributions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.referral_attributions FROM public, anon;
GRANT SELECT, INSERT ON TABLE public.referral_attributions TO authenticated;
GRANT ALL ON TABLE public.referral_attributions TO service_role;

-- Staff Read Policy: Staff members can inspect partner referral attributions
CREATE POLICY referral_attributions_staff_select ON public.referral_attributions
    FOR SELECT
    TO authenticated
    USING (public.auth_is_staff());

-- Staff Insert Policy: Staff members can record partner referral attributions
CREATE POLICY referral_attributions_staff_insert ON public.referral_attributions
    FOR INSERT
    TO authenticated
    WITH CHECK (public.auth_is_staff());

-- ------------------------------------------------------------------------------
-- 3. Atomic Referral Attribution Server RPC (P1-34)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.attribute_profile_referral(
    p_matchmaker_id UUID,
    p_profile_id UUID,
    p_notes TEXT DEFAULT NULL,
    p_attributed_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_caller_id UUID;
    v_mm_status VARCHAR(30);
    v_profile_exists BOOLEAN;
    v_attribution_row public.referral_attributions%ROWTYPE;
    v_current_count INT;
BEGIN
    v_caller_id := auth.uid();

    -- Authorization check: caller must be authenticated active staff
    IF NOT public.auth_is_staff() THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Only bureau staff can attribute profile referrals'
            USING ERRCODE = '42501';
    END IF;

    -- Validate matchmaker existence and active status
    SELECT status INTO v_mm_status
    FROM public.external_matchmakers
    WHERE id = p_matchmaker_id;

    IF v_mm_status IS NULL THEN
        RAISE EXCEPTION 'NOT_FOUND: External matchmaker % does not exist', p_matchmaker_id
            USING ERRCODE = 'P0002';
    END IF;

    IF v_mm_status <> 'active' THEN
        RAISE EXCEPTION 'MATCHMAKER_INACTIVE: Cannot attribute referral to inactive partner (status: %)', v_mm_status
            USING ERRCODE = 'P0003';
    END IF;

    -- Validate profile existence
    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_profile_id) INTO v_profile_exists;
    IF NOT v_profile_exists THEN
        RAISE EXCEPTION 'NOT_FOUND: Candidate profile % does not exist', p_profile_id
            USING ERRCODE = 'P0002';
    END IF;

    -- Upsert / Insert referral attribution
    INSERT INTO public.referral_attributions (
        matchmaker_id,
        profile_id,
        referral_source,
        attributed_by,
        notes,
        created_at
    ) VALUES (
        p_matchmaker_id,
        p_profile_id,
        'external_partner',
        COALESCE(p_attributed_by, v_caller_id),
        p_notes,
        timezone('utc'::text, now())
    )
    ON CONFLICT (matchmaker_id, profile_id) DO UPDATE SET
        notes = COALESCE(EXCLUDED.notes, referral_attributions.notes)
    RETURNING * INTO v_attribution_row;

    -- Deterministically calculate and update referral_count
    SELECT COUNT(*) INTO v_current_count
    FROM public.referral_attributions
    WHERE matchmaker_id = p_matchmaker_id;

    UPDATE public.external_matchmakers
    SET referral_count = v_current_count,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_matchmaker_id;

    -- Audit log
    INSERT INTO public.audit_events (
        actor_id,
        actor_role,
        action,
        target_type,
        target_id,
        details
    ) VALUES (
        COALESCE(v_caller_id, p_attributed_by),
        'staff',
        'profile_referral_attributed',
        'referral_attribution',
        v_attribution_row.id::TEXT,
        jsonb_build_object(
            'matchmaker_id', p_matchmaker_id,
            'profile_id', p_profile_id,
            'total_referrals', v_current_count
        )
    );

    RETURN jsonb_build_object(
        'id', v_attribution_row.id,
        'matchmakerId', v_attribution_row.matchmaker_id,
        'profileId', v_attribution_row.profile_id,
        'referralSource', v_attribution_row.referral_source,
        'attributedBy', v_attribution_row.attributed_by,
        'notes', v_attribution_row.notes,
        'createdAt', v_attribution_row.created_at,
        'totalReferrals', v_current_count
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. Financial Reversal Integrity & Unique Partial Index (P1-36)
-- ------------------------------------------------------------------------------

-- Enforce uniqueness of reversals: a transaction can be reversed at most once
CREATE UNIQUE INDEX IF NOT EXISTS uq_financial_transactions_reversal
    ON public.financial_transactions (reversal_of)
    WHERE reversal_of IS NOT NULL;

-- ------------------------------------------------------------------------------
-- 5. Transaction Type & Status Integrity (P1-37)
-- ------------------------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_financial_tx_reversal_status'
    ) THEN
        ALTER TABLE public.financial_transactions
            ADD CONSTRAINT chk_financial_tx_reversal_status
            CHECK (
                (transaction_type = 'reversal' AND status = 'settled' AND reversal_of IS NOT NULL) OR
                (transaction_type <> 'reversal')
            );
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 6. Atomic Financial Reversal Server RPC (P1-35, P1-36)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.record_financial_reversal(
    p_original_id UUID,
    p_reason TEXT,
    p_recorded_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_caller_id UUID;
    v_orig public.financial_transactions%ROWTYPE;
    v_reversal_row public.financial_transactions%ROWTYPE;
    v_reversal_code VARCHAR(30);
    v_clean_reason TEXT;
BEGIN
    v_caller_id := auth.uid();

    -- Authorization check: caller must be authorized staff (Nadeem / Admin)
    IF NOT public.auth_is_staff() THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Only bureau staff can execute financial reversals'
            USING ERRCODE = '42501';
    END IF;

    v_clean_reason := trim(COALESCE(p_reason, ''));
    IF length(v_clean_reason) = 0 THEN
        RAISE EXCEPTION 'REVERSAL_REASON_REQUIRED: A valid business justification is mandatory to execute a reversal'
            USING ERRCODE = '23502';
    END IF;

    -- Concurrency control: Lock target row FOR UPDATE
    SELECT * INTO v_orig
    FROM public.financial_transactions
    WHERE id = p_original_id
    FOR UPDATE;

    IF v_orig.id IS NULL THEN
        RAISE EXCEPTION 'NOT_FOUND: Original financial transaction % does not exist', p_original_id
            USING ERRCODE = 'P0002';
    END IF;

    -- Integrity rule: Cannot reverse a reversal transaction
    IF v_orig.transaction_type = 'reversal' OR v_orig.reversal_of IS NOT NULL THEN
        RAISE EXCEPTION 'CANNOT_REVERSE_REVERSAL: Transaction % is already a reversal', p_original_id
            USING ERRCODE = '22023';
    END IF;

    -- Integrity rule: Cannot reverse an already reversed transaction
    IF v_orig.status = 'reversed' THEN
        RAISE EXCEPTION 'ALREADY_REVERSED: Transaction % has already been reversed', p_original_id
            USING ERRCODE = '23505';
    END IF;

    IF EXISTS (SELECT 1 FROM public.financial_transactions WHERE reversal_of = p_original_id) THEN
        RAISE EXCEPTION 'ALREADY_REVERSED: Transaction % has already been reversed', p_original_id
            USING ERRCODE = '23505';
    END IF;

    -- Generate reference code
    v_reversal_code := 'REV-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 8);

    -- Update original transaction status to reversed
    UPDATE public.financial_transactions
    SET status = 'reversed'
    WHERE id = p_original_id;

    -- Insert append-only reversal transaction
    INSERT INTO public.financial_transactions (
        reference_code,
        matchmaker_id,
        matchmaker_name,
        profile_id,
        transaction_type,
        amount_pkr,
        currency,
        status,
        reversal_of,
        reversal_reason,
        description,
        effective_date,
        created_by,
        created_at
    ) VALUES (
        v_reversal_code,
        v_orig.matchmaker_id,
        v_orig.matchmaker_name,
        v_orig.profile_id,
        'reversal',
        v_orig.amount_pkr,
        'PKR',
        'settled',
        v_orig.id,
        v_clean_reason,
        'Reversal of ' || v_orig.reference_code || ': ' || v_clean_reason,
        CURRENT_DATE,
        COALESCE(p_recorded_by, v_caller_id),
        timezone('utc'::text, now())
    ) RETURNING * INTO v_reversal_row;

    -- Audit log (omitting sensitive customer PII)
    INSERT INTO public.audit_events (
        actor_id,
        actor_role,
        action,
        target_type,
        target_id,
        details
    ) VALUES (
        COALESCE(v_caller_id, p_recorded_by),
        'staff',
        'financial_transaction_reversed',
        'financial_transaction',
        v_reversal_row.id::TEXT,
        jsonb_build_object(
            'original_id', p_original_id,
            'original_reference_code', v_orig.reference_code,
            'reversal_reference_code', v_reversal_row.reference_code,
            'amount_pkr', v_reversal_row.amount_pkr,
            'reason', v_clean_reason
        )
    );

    RETURN jsonb_build_object(
        'id', v_reversal_row.id,
        'referenceCode', v_reversal_row.reference_code,
        'matchmakerId', v_reversal_row.matchmaker_id,
        'matchmakerName', v_reversal_row.matchmaker_name,
        'profileId', v_reversal_row.profile_id,
        'type', v_reversal_row.transaction_type,
        'amount', v_reversal_row.amount_pkr,
        'currency', v_reversal_row.currency,
        'status', v_reversal_row.status,
        'reversalOf', v_orig.id,
        'reversalReason', v_reversal_row.reversal_reason,
        'description', v_reversal_row.description,
        'date', v_reversal_row.effective_date,
        'createdAt', v_reversal_row.created_at
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 7. Permissions & Grants
-- ------------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.attribute_profile_referral(UUID, UUID, TEXT, UUID) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.attribute_profile_referral(UUID, UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.attribute_profile_referral(UUID, UUID, TEXT, UUID) TO service_role;

REVOKE ALL ON FUNCTION public.record_financial_reversal(UUID, TEXT, UUID) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.record_financial_reversal(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_financial_reversal(UUID, TEXT, UUID) TO service_role;

COMMIT;
