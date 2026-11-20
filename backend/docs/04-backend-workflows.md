# 4. Backend Workflows and Contracts

## 4.1 API approach

This project is a Vite SPA backed by Supabase, not a Next.js application. Use the Supabase client for allowed data operations protected by RLS. Use Edge Functions for privileged operations, secret-bearing integrations, bearer-link handling, and workflows that must enforce multiple invariants atomically.

Do not create a generic REST server merely to wrap every database call. Do not let the client perform a multi-step privileged workflow that can be interrupted or forged.

For every operation, document: authenticated actor, required permission, validated input, database effects, audit event, idempotency/retry behavior, error codes and UI loading/error/success states.

## 4.2 Profile registration and review

### Customer registration
1. Validate the submitted form in the browser for usability.
2. Send the payload through the approved registration path.
3. Validate again at the trusted boundary; normalize and reject malformed values.
4. Create the profile in `pending_review`; never accept client-supplied `approved`, `active`, `verified`, owner role or approval actor.
5. Record the registration source and relevant consent event.
6. Return a safe submission reference, not a full private profile.
7. Notify/show a confirmation without claiming approval.

Public intake abuse controls (rate limiting, CAPTCHA or equivalent) are OPEN until deployment/provider behavior is confirmed.

### Staff-created profile
1. Verify staff session and role.
2. Verify that the staff member may create on behalf of the subject and that the required authorization is recorded.
3. Validate and normalize all fields.
4. Create profile and related records transactionally where feasible.
5. Add an audit event.
6. Return only fields needed by the UI.

### Review transitions (Approved & Implemented in T-007)
The permitted profile lifecycle transitions are enforced via `canTransitionStatus` and database constraints:
- `pending_review -> approved`
- `pending_review -> restricted` (Intake rejected or restricted)
- `approved -> active`
- `approved/active -> restricted`
- `active -> inactive`
- `active -> introduction_authorized` (Authorized for specific match introduction)
- `introduction_authorized -> active` (Introduction completed or reset to registry)
- `introduction_authorized -> inactive` (Proposal finalized / closed)
- `inactive -> pending_review` (Re-activated subject to updated intake review)
- `restricted -> pending_review` (Remediated subject to fresh staff review)

### DTO and Database Row Separation (T-007)
- **Database row (`ProfileRow`):** Normalized snake_case representation in `public.profiles` with integer heights (`height_inches`), non-negative numeric income (`monthly_income_pkr`), and foreign key linkages.
- **Client DTO (`ProfileRecord`):** Rich camelCase domain object used by the frontend with structured sub-objects (`siblings`, `property`, `preferences`).
- **Least-privilege field sanitization:** `sanitizeProfileForRole()` automatically scrubs sensitive contact details (`contactPhone`, `contactEmail`), precise address, and `internalNotes` when accessed by unauthorized parties or non-owner customers.

### Sibling and Property Validation (Approved & Implemented in T-015 / OPEN-011)
- **Sibling Records:** Validated via `validateSiblingRecord` ensuring relation is strictly `brother` or `sister`, non-negative age, and valid marital status. Third-party views automatically scrub real sibling names and in-law family details until introduction authorization.
- **Property Details:** Validated via `validatePropertyDetails` ensuring non-negative Marla area and non-negative estimated value.
- **Land Unit Conversion:** Pakistani baseline (20 Marla = 1 Kanal) is enriched automatically via `enrichPropertyDetails` (`convertMarlaToKanal`). Estimated PKR net worth is locked from third-party viewers until introduction authorization.

Do not allow arbitrary status updates. Every transition records actor, timestamp and reason code. “Approved”, “active”, “verified”, and “authorized for introduction” are distinct concepts; do not collapse them.

## 4.3 Profile update and duplicate review

- Customers may update only explicitly customer-editable fields on their own profile.
- Sensitive/admin-only fields must not be writable through the customer update path.
- Use field allowlists, not a blacklist.
- Validate all server-side input and use database constraints.
- If a likely duplicate is detected, flag it for human review; do not automatically merge or delete.
- Preserve relevant change history without duplicating the entire sensitive profile in audit logs.

## 4.4 Search

- Search requires authentication and a permitted scope.
- Return only fields needed for the result card.
- Use pagination with stable ordering; do not download all profiles to the browser and filter them in memory.
- Search filters must be parameterized and validated.
- Search may use only fields permitted by policy and approved by the product owner.
- Inactive, restricted, unauthorized, consent-withdrawn or otherwise ineligible profiles must not be recommended or shared.
- Measure query plans and performance with at least 100,000 synthetic profiles before claiming the capacity target.

## 4.5 Match review

1. Select an eligible primary profile and candidate within authorized scope.
2. Run deterministic eligibility checks and configured scoring.
3. Persist a versioned evaluation and explanation.
4. Show missing/unverified values as such; do not fabricate.
5. Require an explicit human review decision.
6. Persist the decision and audit event.
7. Re-check current eligibility and consent before any sharing operation.

A UI button click or local state update is not a durable decision.

## 4.6 Controlled sharing

1. Staff selects candidate, recipient context and exact disclosure fields.
2. Server validates the actor, both profile states, relevant consent, and permitted field set.
3. Server creates a snapshot containing only approved fields and a share grant with expiry/revocation state.
4. The UI previews the exact message before opening WhatsApp.
5. WhatsApp opens with prepared text only; opening it is not proof of delivery.
6. Access to a protected link is checked on every request; revoked/expired grants are denied.
7. Audit records capture the event and safe metadata, not the full message body or raw token.

Do not build a public URL that simply embeds a profile ID and fetches all fields. See [matching and sharing](05-matching-and-sharing.md).

## 4.7 Financial workflows (T-012 — Auditable Financial Ledger)

Implemented in `frontend/src/lib/finance.ts`, backed by database migrations `00002_financial_ledger.sql` and `00010_matchmaker_and_finance_enhancements.sql`, wired into `frontend/src/App.tsx`, and verified via `src/lib/finance.test.ts` and `backend/tests/migration_00010.test.js`:
- **Partner Clearinghouse Sub-Ledger Accounting Model (P1-38):**
  - Tracks clearinghouse obligations (`payable`, `receivable`), settlements (`paid`, `received`), and corrections (`reversal`) between Gulistan Marriage Bureau and external partners.
  - Distinct from a general journal with debit/credit double-entry postings; preserves approved partner clearinghouse model with rigorous integrity constraints.
- **Explicit Currency & Precision:** Currency is strictly PKR (`ISO-4217: PKR`) with positive integer precision (`amount_pkr > 0`, `currency = 'PKR'`). Floating-point or fractional amounts are disallowed.
- **Sign Convention & Balance Formula (OPEN-010):**
  - `'payable'`: Bureau owes partner agency (liability). Defaults to 'pending' status.
  - `'receivable'`: Partner agency owes Bureau (asset). Defaults to 'pending' status.
  - `'paid'`: Settlement disbursement reducing liability. Defaults to 'settled' status.
  - `'received'`: Settlement collection reducing receivable. Defaults to 'settled' status.
  - `'reversal'`: Correction counteracting prior entry. Always 'settled' status.
  - `Net Balance = Total Pending Receivable - Total Pending Payable` (positive = partner owes Bureau / asset; negative = Bureau owes partner / liability; zero = settled).
- **Append-Only Database Ledger & Atomic Reversals (P1-35, P1-36, P1-37):**
  - Historical entries cannot be silently overwritten or deleted (no update/delete RLS).
  - Database-level partial unique index `uq_financial_transactions_reversal` on `financial_transactions(reversal_of)` ensures a transaction can be reversed at most once.
  - Check constraint `chk_financial_tx_reversal_status` guarantees reversals are always 'settled' and reference non-null `reversal_of`.
  - Atomic server RPC `record_financial_reversal(p_original_id, p_reason, p_recorded_by)` locks original transaction `FOR UPDATE`, checks for double-reversals, sets original `status = 'reversed'`, and appends reversal entry with canonical UUID linkage.
- **Deterministic Reconciliation:** `reconcileLedger` and `calculatePartnerLedger` reconcile total pending liabilities, settled volume, and net balances across all partner agencies. Resolves reversals referencing either canonical database UUID or human reference code.
- **Role-Based Access & Minimal Audit:** Ledger access is restricted to Lead Matchmaker (Nadeem Ahmed) and Admin (`canAccessFinance`). Every ledger write logs an audit event omitting customer PII (Section 3.7).







## 4.8 Follow-ups and External Matchmaker Attribution (T-011)

Implemented in `frontend/src/lib/followUps.ts`, integrated into `frontend/src/App.tsx`, and tested via `src/lib/followUps.test.ts` and `backend/tests/followups_crm.test.js`:
- **Server-Side Access Scope (OPEN-002):** Follow-ups and external matchmaker directories are restricted to Lead Matchmaker (Nadeem Ahmed) and Admin (`canAccessCRM`). Customer and unauthenticated access fails closed (`UNAUTHORIZED`).
- **Input & Date Validation:** Validates profile references, contact names, valid phone numbers, ISO due dates, priorities (`high`, `medium`, `low`), and task types (`initial_consult`, `proposal_decision`, `meeting_arrangement`, `photo_request`, `payment_reminder`).
- **Dynamic Overdue Calculation:** `computeFollowUpStatus` automatically evaluates calendar date boundaries to mark past-due pending tasks as `overdue`. Completed tasks permanently remain `completed`.
- **Completion Tracking & Idempotency:** `completeFollowUp` records `completedAt` timestamp, `completedBy` email/actor ID, and completion notes. Calling completion on an already completed follow-up is safely idempotent.
- **Partner UUID Preservation vs Human Code (P1-32):** Database UUIDs are preserved as primary record identifiers (`id`), while human-readable codes (`MM-MUL-01`, etc.) are maintained in `code`. Foreign-key relations use database UUIDs.
- **Tiered Partner Agreements Schema (P1-33):**
  - Migration `00010_matchmaker_and_finance_enhancements.sql` adds `tiered_rules JSONB NULL` to `public.matchmaker_agreements`.
  - Supports percentage, flat-fee, and progressive tiered agreements (e.g. `[{"minMatches": 1, "maxMatches": 5, "ratePercent": 15}, {"minMatches": 6, "maxMatches": null, "ratePercent": 20}]`).
  - Active agreements supersede prior agreements automatically while preserving full historical terms.
- **Durable Referral Attributions Table & Atomic Server RPC (P1-34):**
  - Migration `00010` provisions `public.referral_attributions` with foreign keys to `external_matchmakers(id)` and `profiles(id)`.
  - Unique constraint `uq_referral_partner_profile` prevents duplicate attributions and provides idempotency.
  - Server RPC `attribute_profile_referral(p_matchmaker_id, p_profile_id, p_notes, p_attributed_by)` verifies staff authorization, validates active partner status, records attribution, deterministically updates partner `referral_count`, and emits minimal audit trail.
- **External Matchmaker Referral Attribution:** `attributeProfileToMatchmaker` verifies that partner agency is active, increments `profilesReferredCount`, and attributes candidate source to `external_matchmaker` in alignment with database check constraint `chk_profiles_source`. Inactive agencies are rejected (`MATCHMAKER_INACTIVE`).
- **Consequential Audit Trail (Section 3.7):** Actions `follow_up_created`, `follow_up_completed`, and `matchmaker_attributed` log structured metadata (`actor_id`, `actor_role`, `target_type`, `target_id`, `details`) omitting raw phone numbers, full notes, or sensitive PII.





## 4.9 Customer Portal Recommendations, Preferences, and Follow-Up Reminder Delivery Model (T-036)

Implemented under Task `T-036` and Migration `00009_customer_portal_and_crm_enhancements.sql`:
- **Customer Recommendations Server RPC (`get_customer_recommendations`):**
  - Bound strictly to profile ownership (`account_id = auth.uid()` or `created_by = auth.uid()`) and active account status (`auth_is_account_active()`).
  - Queries match cases where status is strictly approved (`approved_by_nadeem`, `shared_with_parties`, `accepted_by_customer`).
  - Projects sanitized candidate attributes (display pseudonym, age, gender, height, education, occupation, job title, city, area, religion, sect, caste, marital status, family background notes) while strictly withholding direct phone numbers, email addresses, and full legal names.
- **Durable Preference Persistence (`update_profile_preferences`):**
  - Customers with profiles in `pending_review`, `active`, or `introduction_authorized` status can persist preference adjustments (`ageMin`, `ageMax`, `educationMin`, `caste`, `cityPreferences`, `familyArrangement`, and `criteriaClassifications` importance weights).
  - Server RPC executes an atomic upsert on `public.profile_preferences` and emits an audit event.
- **Customer Self-Service Requests & Durable CRM Linkage:**
  - Customers can submit `profile_correction`, `deactivation_request`, `photo_consent_change`, or `customer_inquiry` follow-ups directly through Customer Portal.
  - Deactivation requests are categorized as `urgent`/`high` priority.
  - Follow-up inserts resolve reference codes to database UUIDs (`profile_id`, `match_case_id`, `assigned_to`) and enforce validated contact information without inventing fabricated placeholder names or phone numbers (remediating P1-30 and P1-31).
- **Follow-Up Reminder Delivery Model (P2-06):**
  - Schema support in `public.crm_follow_ups` for `reminder_sent_at TIMESTAMPTZ` and `notification_channel VARCHAR(30)` (`in_app`, `email`, `whatsapp`, `sms`) with index on `(scheduled_date, status, reminder_sent_at)`.
  - Baseline delivery engine is the in-app Operational Calling Desk (`FollowUpsView.tsx`) classifying pending items into `overdue`, `dueToday`, and `upcoming48h`. External channels (WhatsApp/email/SMS) remain configurable pending owner gateway credential approval.

## 4.10 Error contract

Use stable, non-sensitive error codes such as:
- `UNAUTHENTICATED`
- `FORBIDDEN`
- `NOT_FOUND` (also use when revealing existence would leak information)
- `VALIDATION_ERROR`
- `INVALID_STATE_TRANSITION`
- `CONSENT_REQUIRED`
- `SHARE_EXPIRED`
- `SHARE_REVOKED`
- `CONFLICT`
- `RATE_LIMITED`
- `INTERNAL_ERROR`

Do not return SQL errors, stack traces, secrets, storage paths, or private record values to clients. Provide localized user-facing messages separately from machine-readable error codes.

## 4.11 Staged Migration Engine, Consent Review, and Durable Rollback (T-038)

Implemented under Task `T-038` and Migration `00011_durable_migration_batches_and_reconciliation.sql`, verified by `frontend/src/lib/migration.test.ts` (13 tests) and `backend/tests/migration_00011.test.js` (8 tests):
- **Durable Persistence via Migration Repository (P1-39):**
  - Migration batches and staged records are managed through `IMigrationRepository` (`MigrationRepositoryImpl`), supporting PostgreSQL PostgREST in backend mode and in-memory storage in demo mode. No transient in-memory arrays are used across functional boundaries.
- **Zero Demographic Fact Fabrication (P1-40):**
  - Invariant validation (`validateProfileInput`) strictly verifies mandatory Pakistani matrimonial fields: `fullName`, `contactPhone`, `gender`, `age`, `maritalStatus`, `religion`, `aqeedah`, `caste`, `education`, `occupation`, and `currentCity`.
  - Records with missing mandatory invariants are quarantined with reason `DATA_VALIDATION_ERROR` rather than manufactured.
  - Optional fields (`height`, `educationField`, `jobTitle`, `hometown`, `residenceArea`) are left blank or unset when absent; no default values (e.g. "5'6\"", "General", "Employee", "Lahore", "Local") are ever injected into customer candidate profiles.
- **Conflict Merge Update Semantics (P1-41):**
  - When a staged record matches an existing profile and is marked with `resolutionAction === 'merge_update'`, the system invokes `profileRepository.updateProfileDetails()` to update the candidate's existing record (qualifications, occupation, internal notes, etc.) without creating a duplicate candidate profile.
- **Atomic Server-Side Batch Import (P1-42):**
  - Staged imports require affirmative owner approval (`status = 'approved_by_owner'` with non-null `owner_approved_by`).
  - Server RPC `import_migration_batch` executes inside a single transaction with a row lock `FOR UPDATE` on `migration_batches`, creating candidate profiles, executing merge updates, setting staged statuses to `imported`, and recording batch counts atomically.
- **Explicit Independent Consent Review (P1-43):**
  - Regular expression keyword matching (e.g. "consent", "رضامندی", "اجازت") in chat messages is treated strictly as an unverified text mention, never as certified legal consent.
  - Legal consent requires explicit reviewer certification: candidate consent and guardian/representative consent are evaluated independently and must be confirmed prior to intake authorization.
- **Cryptographic Byte Hashing for Photo Assets (P1-44):**
  - SHA-256 asset checksums in `computeSha256` are calculated over the actual binary content bytes (`Uint8Array` or string), not metadata strings such as file names or byte sizes.
- **Deterministic Reconciliation & Record Counting (P1-45):**
  - Reconciliation recomputes SHA-256 hashes from source payloads and compares them directly against persisted batch digests.
  - Verifies exact record balance: `totalRecords === importedRecords + quarantinedRecords + skippedRecords`. Any mismatch flags reconciliation failure.
- **Durable Rollback with Granular Row Error Tracking (P1-46):**
  - Batch rollback via server RPC `rollback_migration_batch` and `rollbackMigrationBatch` deactivates imported candidate profiles to `restricted` status, deactivates photo records, updates staged records to `rolled_back`, updates batch status to `rolled_back`, and writes an audit event.
  - Catches and records per-row errors without swallowing failures or corrupting state.
- **Raw Conversation Minimization & Purge (P1-47):**
  - Staged raw conversations often contain sensitive third-party PII. RPC `purge_staged_raw_content` and `purgeStagedRawContent` null out the plaintext `raw_content` while persisting the SHA-256 `raw_content_hash` for provenance and setting `is_raw_purged = TRUE`.

