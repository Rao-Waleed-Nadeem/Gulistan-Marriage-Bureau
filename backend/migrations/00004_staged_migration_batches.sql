-- ==============================================================================
-- Gulistan Marriage Bureau — Migration 00004: Staged Migration Batches & Quarantine
-- ==============================================================================
-- Architectural Scope:
--   - Workstream W8 / T-028: Staged WhatsApp and Phone-Gallery Migration
--   - Tables:
--       * public.migration_batches: Tracks batch provenance, checksums, actor, status, and owner approval
--       * public.migration_staged_records: Individual biodata and photo rows with consent verification,
--         quarantine flags, conflict links, and human resolution notes
--   - Invariants:
--       * Never indiscriminately scrape or import raw customer chats/photos
--       * No silent overwrites: duplicate or conflicting records are quarantined for review
--       * Every imported row has explicit source, consent, and actor provenance
--       * No real data imported without owner approval; batch reconciles atomically
--   - Security:
--       * Row-Level Security (RLS) enabled on all migration tables
--       * Explicit REVOKE from public and anon
--       * Restricted to authenticated staff (admin and matchmaker)
--       * Full administrative access to service_role
--       * No mock data seeding
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. Migration Batches
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.migration_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_code VARCHAR(100) UNIQUE NOT NULL,
    source_type VARCHAR(50) NOT NULL,
    source_reference VARCHAR(255) NOT NULL,
    source_checksum VARCHAR(64) NOT NULL,
    total_records INT NOT NULL DEFAULT 0,
    staged_records INT NOT NULL DEFAULT 0,
    quarantined_records INT NOT NULL DEFAULT 0,
    imported_records INT NOT NULL DEFAULT 0,
    status VARCHAR(40) NOT NULL DEFAULT 'staged',
    owner_approved_by UUID NULL,
    owner_approved_at TIMESTAMPTZ NULL,
    created_by UUID NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chk_migration_batch_source_type CHECK (
        source_type IN ('whatsapp_chat_export', 'phone_gallery_archive', 'csv_template')
    ),
    CONSTRAINT chk_migration_batch_status CHECK (
        status IN ('cataloged', 'staged', 'dry_run_completed', 'approved_by_owner', 'imported', 'reconciled', 'rolled_back')
    ),
    CONSTRAINT chk_migration_batch_checksum_len CHECK (
        char_length(source_checksum) = 64
    )
);

CREATE INDEX IF NOT EXISTS idx_migration_batches_status ON public.migration_batches (status);
CREATE INDEX IF NOT EXISTS idx_migration_batches_created_at ON public.migration_batches (created_at DESC);

-- ------------------------------------------------------------------------------
-- 2. Staged Migration Records & Quarantine
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.migration_staged_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES public.migration_batches(id) ON DELETE CASCADE,
    row_index INT NOT NULL,
    raw_content TEXT NOT NULL,
    parsed_payload JSONB NOT NULL,
    source_provenance JSONB NOT NULL,
    consent_verification JSONB NOT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'staged',
    quarantine_reason VARCHAR(100) NULL,
    conflict_profile_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    conflict_details TEXT NULL,
    resolution_action VARCHAR(40) NULL,
    resolution_notes TEXT NULL,
    resolved_by UUID NULL,
    resolved_at TIMESTAMPTZ NULL,
    imported_profile_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chk_migration_record_status CHECK (
        status IN ('staged', 'quarantined', 'approved', 'imported', 'rejected')
    ),
    CONSTRAINT chk_migration_record_resolution_action CHECK (
        resolution_action IS NULL OR resolution_action IN ('create_new', 'merge_update', 'reject')
    ),
    CONSTRAINT uq_migration_batch_row UNIQUE (batch_id, row_index)
);

CREATE INDEX IF NOT EXISTS idx_migration_records_batch_id ON public.migration_staged_records (batch_id);
CREATE INDEX IF NOT EXISTS idx_migration_records_status ON public.migration_staged_records (status);
CREATE INDEX IF NOT EXISTS idx_migration_records_conflict ON public.migration_staged_records (conflict_profile_id);

-- ------------------------------------------------------------------------------
-- 3. Row-Level Security (RLS) & Access Control
-- ------------------------------------------------------------------------------

ALTER TABLE public.migration_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_staged_records ENABLE ROW LEVEL SECURITY;

-- Revoke all permissions from public and anon
REVOKE ALL ON TABLE public.migration_batches FROM public, anon;
REVOKE ALL ON TABLE public.migration_staged_records FROM public, anon;

-- Grant least-privilege operations to authenticated users
GRANT SELECT, INSERT, UPDATE ON TABLE public.migration_batches TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.migration_staged_records TO authenticated;

-- Grant administrative full access to service_role
GRANT ALL ON TABLE public.migration_batches TO service_role;
GRANT ALL ON TABLE public.migration_staged_records TO service_role;

-- Policies for migration_batches: staff-only access
CREATE POLICY migration_batches_staff_all ON public.migration_batches
    FOR ALL TO authenticated USING (public.auth_is_staff());

-- Policies for migration_staged_records: staff-only access
CREATE POLICY migration_records_staff_all ON public.migration_staged_records
    FOR ALL TO authenticated USING (public.auth_is_staff());

COMMIT;
