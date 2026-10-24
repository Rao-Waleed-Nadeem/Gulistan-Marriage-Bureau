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

Implemented in `frontend/src/lib/finance.ts`, backed by database migration `00002_financial_ledger.sql`, wired into `frontend/src/App.tsx`, and tested via `src/lib/finance.test.ts` and `backend/tests/financial_ledger.test.js`:
- **Explicit Currency & Precision:** Currency is strictly PKR (`ISO-4217: PKR`) with positive integer precision (`amount_pkr > 0`, `currency = 'PKR'`). Floating-point or fractional amounts are disallowed.
- **Sign Convention & Balance Formula (OPEN-010):**
  - `'payable'`: Bureau owes partner agency (liability).
  - `'receivable'`: Partner agency owes Bureau (asset).
  - `'paid'`: Settlement disbursement reducing liability.
  - `'received'`: Settlement collection reducing receivable.
  - `Net Balance = Total Pending Payable - Total Pending Receivable` (positive = Bureau owes partner; negative = partner owes Bureau).
- **Append-Only Database Ledger & Traceable Reversals:** Historical entries cannot be silently overwritten or deleted. Migration `00002_financial_ledger.sql` defines Row-Level Security policies with strictly NO UPDATE or DELETE grants. Errors are corrected exclusively by appending inverse reversal records referencing `reversal_of` with documented business reasons.
- **Deterministic Reconciliation:** `reconcileLedger` and `calculatePartnerLedger` reconcile total pending liabilities, settled volume, and net balances across all partner agencies.
- **Role-Based Access & Minimal Audit:** Ledger access is restricted to Lead Matchmaker (Nadeem Ahmed) and Admin (`canAccessFinance`). Every ledger write logs an audit event omitting customer PII (Section 3.7).







## 4.8 Follow-ups and External Matchmaker Attribution (T-011)

Implemented in `frontend/src/lib/followUps.ts`, integrated into `frontend/src/App.tsx`, and tested via `src/lib/followUps.test.ts` and `backend/tests/followups_crm.test.js`:
- **Server-Side Access Scope (OPEN-002):** Follow-ups and external matchmaker directories are restricted to Lead Matchmaker (Nadeem Ahmed) and Admin (`canAccessCRM`). Customer and unauthenticated access fails closed (`UNAUTHORIZED`).
- **Input & Date Validation:** Validates profile references, contact names, valid phone numbers, ISO due dates, priorities (`high`, `medium`, `low`), and task types (`initial_consult`, `proposal_decision`, `meeting_arrangement`, `photo_request`, `payment_reminder`).
- **Dynamic Overdue Calculation:** `computeFollowUpStatus` automatically evaluates calendar date boundaries to mark past-due pending tasks as `overdue`. Completed tasks permanently remain `completed`.
- **Completion Tracking & Idempotency:** `completeFollowUp` records `completedAt` timestamp, `completedBy` email/actor ID, and completion notes. Calling completion on an already completed follow-up is safely idempotent.
- **External Matchmaker Referral Attribution:** `attributeProfileToMatchmaker` verifies that partner agency is active, increments `profilesReferredCount`, and attributes candidate source to `external_matchmaker` in alignment with database check constraint `chk_profiles_source`. Inactive agencies are rejected (`MATCHMAKER_INACTIVE`).
- **Consequential Audit Trail (Section 3.7):** Actions `follow_up_created`, `follow_up_completed`, and `matchmaker_attributed` log structured metadata (`actor_id`, `actor_role`, `target_type`, `target_id`, `details`) omitting raw phone numbers, full notes, or sensitive PII.





## 4.9 Error contract

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
