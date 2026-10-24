-- ==============================================================================
-- Gulistan Marriage Bureau — Migration 00002: Auditable Financial Ledger
-- ==============================================================================
-- Architectural Scope:
--   - Double-entry bureau convention (OPEN-010)
--   - Currency explicitly PKR with non-negative integer precision
--   - Append-only financial ledger (financial_transactions)
--   - Traceable reversals referencing original transaction (reversal_of)
--   - Row-Level Security (RLS) enabled: staff-only read/write, strictly NO UPDATE or DELETE
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. Financial Transactions Table
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_code VARCHAR(30) NOT NULL,
    matchmaker_id VARCHAR(50) NOT NULL,
    matchmaker_name VARCHAR(255) NOT NULL,
    profile_id VARCHAR(50) NULL,
    transaction_type VARCHAR(30) NOT NULL,
    amount_pkr NUMERIC(14, 0) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'PKR',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    reversal_of UUID NULL REFERENCES public.financial_transactions(id),
    reversal_reason TEXT NULL,
    description TEXT NOT NULL,
    effective_date DATE NOT NULL,
    created_by UUID NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    -- Integrity Constraints
    CONSTRAINT uq_financial_tx_reference_code UNIQUE (reference_code),
    CONSTRAINT chk_financial_tx_type CHECK (transaction_type IN ('payable', 'receivable', 'paid', 'received', 'reversal')),
    CONSTRAINT chk_financial_tx_amount_positive CHECK (amount_pkr > 0),
    CONSTRAINT chk_financial_tx_currency CHECK (currency = 'PKR'),
    CONSTRAINT chk_financial_tx_status CHECK (status IN ('pending', 'settled', 'reversed'))
);

-- Operational Query Indexes
CREATE INDEX IF NOT EXISTS idx_financial_tx_matchmaker ON public.financial_transactions (matchmaker_id);
CREATE INDEX IF NOT EXISTS idx_financial_tx_status ON public.financial_transactions (status);
CREATE INDEX IF NOT EXISTS idx_financial_tx_type ON public.financial_transactions (transaction_type);
CREATE INDEX IF NOT EXISTS idx_financial_tx_created_at ON public.financial_transactions (created_at DESC);

-- ------------------------------------------------------------------------------
-- 2. Row-Level Security (RLS) & Access Policies
-- ------------------------------------------------------------------------------

ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

-- Deny all access to unauthenticated public/anon visitors
REVOKE ALL ON TABLE public.financial_transactions FROM public, anon;

-- Grant least-privilege operations to authenticated users and service_role
GRANT SELECT, INSERT ON TABLE public.financial_transactions TO authenticated;
GRANT ALL ON TABLE public.financial_transactions TO service_role;

-- Staff Read Policy: Staff members (Nadeem / Admin) can inspect ledger entries
CREATE POLICY financial_tx_staff_select ON public.financial_transactions
    FOR SELECT
    TO authenticated
    USING (public.auth_is_staff());

-- Staff Insert Policy: Staff members can append new ledger entries
CREATE POLICY financial_tx_staff_insert ON public.financial_transactions
    FOR INSERT
    TO authenticated
    WITH CHECK (public.auth_is_staff());

-- Strictly NO UPDATE or DELETE policies for financial_transactions.
-- This mathematically enforces the append-only ledger invariant at the database level:
-- historical financial records cannot be silently overwritten or modified. Corrections
-- must be executed via traceable reversal transactions referencing reversal_of.

COMMIT;
