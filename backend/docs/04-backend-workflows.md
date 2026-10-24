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

## 4.7 Financial workflows

- Only authorized finance users can read or write ledger records.
- Amount, currency, effective date, party and transaction type are validated server-side.
- Use idempotency keys or unique external operation IDs to avoid duplicate entries on retries.
- Corrections should be traceable reversals/adjustments, not silent edits.
- Compute balances from authoritative ledger entries using a documented sign convention.
- Record audit events without exposing unnecessary customer details.
- Exact meaning of `payable`, `receivable`, `paid`, `received`, commission timing and settlement policy is OPEN; see document 09.

## 4.8 Follow-ups

- Follow-ups must be scoped to permitted profiles/matches.
- Store due dates consistently and display in the user's local timezone.
- Restrict contact numbers and notes to authorized roles.
- Completion records who completed it and when.
- Do not send automated WhatsApp messages in the initial scope.

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
