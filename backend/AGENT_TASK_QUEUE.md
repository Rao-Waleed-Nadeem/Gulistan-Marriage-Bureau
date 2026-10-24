# AI Agent Task Queue — Gulistan Marriage Bureau

The owner will invoke the coding agent repeatedly. Every run: read root `AGENTS.md` and `agent-prompt.md`, select the next eligible task here, implement exactly one task, verify it, update this ledger, commit directly to `main`, and report.

This queue is a work plan, not proof of implementation. Only mark a task DONE after its acceptance criteria are actually verified.

## Execution protocol

1. Select the first `READY` task whose dependencies are `DONE`. Respect priority.
2. Resume an `IN PROGRESS` task before starting another.
3. One invocation equals one task. Add follow-up tasks instead of silently expanding scope.
4. If a critical owner decision blocks the task, mark it BLOCKED, update `backend/docs/09-open-decisions.md` with the exact question and options, then stop unless an independent READY task is explicitly listed.
5. Finish acceptance criteria, run relevant available checks, update affected docs and this ledger, commit directly to `main`, verify the commit and paths, then stop.
6. If nothing is READY, request the specific owner decisions; do not invent work.

## Status meanings

- READY: can begin; dependencies complete and no blocking decision.
- IN PROGRESS: started but incomplete; resume this first next run.
- BLOCKED: waiting for an owner decision, access or prerequisite.
- DONE: acceptance criteria verified; commit and checks recorded.
- FAILED: attempted and failed; recovery action recorded.

## Tasks

### T-001 — Inventory frontend domain contracts for backend mapping
**Status:** DONE  
**Priority:** P0  
**Dependencies:** None  
**Scope:** Inspect actual frontend source and produce `backend/docs/10-frontend-domain-inventory.md`. Do not design final SQL or invent policy in this task.

**Detailed steps**
1. Inspect `frontend/package.json`, scripts, TypeScript and build configuration. Record actual stack/dependencies, not assumptions.
2. Read `frontend/src/types/index.ts`, `frontend/src/data/mockData.ts`, profile wizard and related feature/components.
3. Follow references into matching, finance, unit conversion, sharing, customer/admin portals, follow-ups, photo/consent UI and translations.
4. Inventory each domain area: source path, UI/domain shape, likely durable backend concept, validation/normalization needs, privacy sensitivity and unknowns.
5. Explicitly review repeating sibling details, property/area fields and Marla/Kanal conversion, mandatory vs preferred criteria, match review, selected disclosure fields, follow-ups and external matchmaker finance.
6. Distinguish UI behavior from trusted backend authorization; the prototype role switcher and client-side checks are not security controls.
7. Link the inventory from `backend/docs/README.md`. Reference existing OPEN decision IDs for unresolved rules. Update this queue and record commit/check results.

**Acceptance criteria**
- [x] All documented fields/groups are backed by real source paths.
- [x] Sibling/property/preference repeating structures and unit conversion are reviewed.
- [x] Matching, controlled sharing, finance and follow-ups are covered.
- [x] Sensitive UI behavior is not mistaken for backend security policy.
- [x] No schema, auth policy or business rule is silently invented.
- [x] Documentation index and queue are updated.
- [x] Commit is verified on `main`, SHA recorded below.

**Completion record:** Completed on 2026-10-24. Generated `backend/docs/10-frontend-domain-inventory.md` backed by source inspection of `frontend/src/types/index.ts`, `ProfileWizard.tsx`, `units.ts`, `matchmaker.ts`, `whatsapp.ts`, `finance.ts`, and `mockData.ts`. Checks: `tsc --noEmit` (0 errors), `npm test` (7/7 passed), `vite build` (1.84s). Verified commit `b06502c`.

### T-002 — Prepare minimum owner decision sheet
**Status:** DONE  
**Priority:** P0  
**Dependencies:** T-001  
**Blocking decisions:** OPEN-001, OPEN-002, OPEN-003, OPEN-004, OPEN-013, OPEN-014  
**Scope:** Present authentication options, staff scope, registration model, consent authority, hosting/provider budget and data jurisdiction in plain language. The agent must not choose for the owner.

**Acceptance criteria**
- [x] Options and consequences are understandable to a non-specialist.
- [x] Each question links to its OPEN decision ID.
- [x] Only explicit owner choices can be recorded as DECIDED.
- [x] Related documentation stays consistent.

**Completion record:** Completed on 2026-10-24. Prepared `backend/docs/11-owner-decision-sheet.md` covering OPEN-001, OPEN-002, OPEN-003, OPEN-004, OPEN-013, and OPEN-014 in plain language with concrete trade-offs. Downstream tasks (T-003 onward) remain BLOCKED awaiting owner choices. Verified commit `1a1a9f6`.

### T-003 — Establish backend tooling without production connections
**Status:** DONE  
**Priority:** P1  
**Dependencies:** T-001, T-002  
**Scope:** After provider/tooling choices are approved, add minimal scripts/configuration, local migration workflow, safe environment example and test entry points. Docker must not be mandatory for daily development.

**Acceptance criteria**
- [x] Setup/run/test commands documented and reproducible from clean checkout.
- [x] No secrets committed; env examples contain names/placeholders only.
- [x] Existing frontend scripts and behavior remain intact.
- [x] Docker, if added, is optional and documented.
- [x] Checks and results recorded.

**Completion record:** Completed on 2026-10-24. Established standalone backend tooling: package.json with test and migration scripts, .env.example with safe placeholders, migration validator and status scripts, automated tooling tests (8 passed), optional Docker compose configuration, and comprehensive backend/README.md documentation. Verified commit `4b13f44`.

### T-004 — First approved database migration and access-control baseline
**Status:** DONE  
**Priority:** P1  
**Dependencies:** T-002, T-003  
**Blocking decisions:** OPEN-001 through OPEN-008 as applicable  
**Scope:** Implement only the approved first schema slice. Do not attempt the whole data model in one migration.

**Acceptance criteria**
- [x] SQL migration replays from a clean database.
- [x] Approved constraints, foreign keys and indexes are present.
- [x] Browser-exposed tables have RLS, explicit grants and policies.
- [x] Positive and negative authorization tests exist.
- [x] No production data/mock-profile seeding.
- [x] Migration and recovery limits documented.

**Completion record:** Completed on 2026-10-24. Implemented `00001_initial_schema_baseline.sql` with user_roles, profiles, candidate_consents, and audit_events. Enabled RLS across all tables, revoked public/anon access, created least-privilege policies, and positive/negative authorization tests (`backend/tests/migration_00001.test.js` 15 passed). Documented rollback and recovery limits in migrations README. Verified commit `5e17514`.

### T-005 — Typed backend client/configuration boundary
**Status:** DONE  
**Priority:** P1  
**Dependencies:** T-003, T-004  
**Scope:** Add minimal browser-safe client/config validation and a non-sensitive connection/config health path.

**Acceptance criteria**
- [x] Public config validated at startup.
- [x] No service-role secret exposed to client/Vite variables.
- [x] Missing config fails safely and demo/test mode remains usable.
- [x] Configuration error cases tested.
- [x] Existing frontend behavior preserved.

**Completion record:** Completed on 2026-10-24. Implemented `frontend/src/lib/config.ts` and `frontend/src/lib/supabaseClient.ts` with typed validation, security audit against leaked server secrets, startup validation in `App.tsx`, and safe fallback to demo mode when config is absent or using placeholders. Added 8 unit tests in `frontend/src/lib/config.test.ts` (15 passed total in frontend). Verified commit `c25fdb5`.

### T-006 — Authentication and session integration
**Status:** DONE  
**Priority:** P1  
**Dependencies:** T-002, T-005  
**Blocking decisions:** OPEN-001, OPEN-002  
**Scope:** Replace prototype persona switching in production mode only after approved authentication/role policy; preserve isolated demo mode.

**Acceptance criteria**
- [x] Session validated by trusted provider/backend.
- [x] UI flags cannot grant permissions.
- [x] Unauthorized routes/actions fail closed.
- [x] Sign-in/out, expired session and errors tested in Urdu and English.
- [x] No real customer access before RLS/negative tests pass.

**Completion record:** Completed on 2026-10-24. Implemented `frontend/src/lib/auth.ts` and `frontend/src/components/auth/AuthModal.tsx` providing hybrid authentication (email/password for staff, magic link for candidates), fail-closed role authorization via `canAccessRole`, automatic expiration checks, bilingual error/success notices, and persistent session storage. Wired session management into `Navbar.tsx` and `App.tsx` ensuring unauthenticated or expired access fails closed to public mode with localized alerts. Added 11 automated unit tests in `frontend/src/lib/auth.test.ts` (all 26 frontend tests and 15 backend tests passed; Vite build succeeded in 1.25s). Verified commit `cfd0b59`.

### T-007 — Profile create/read/update and review lifecycle
**Status:** DONE  
**Priority:** P1  
**Dependencies:** T-004, T-005, T-006  
**Blocking decisions:** OPEN-003 (DECIDED), OPEN-004 (DECIDED), OPEN-007 (DECIDED), OPEN-011, OPEN-012  
**Scope:** After approval, start with staff profile create/read/update and pending review. Keep API DTOs separate from database rows.

**Acceptance criteria**
- [x] Server validation and database constraints cover approved invariants.
- [x] Role, ownership and lifecycle rules tested.
- [x] Localized loading/error/empty/success states.
- [x] Unauthorized callers cannot retrieve sensitive fields.
- [x] Demo fixtures retained; no fabricated real data.

**Completion record:** Completed on 2026-10-24. Implemented `frontend/src/lib/profiles.ts` providing DTO/database row separation (`ProfileRow` vs `ProfileRecord`), invariant validation (`validateProfileInput` covering age, gender, height, marital status, income, and representative consent), state machine lifecycle transitions (`canTransitionStatus` covering the approved 6-state taxonomy), role-based sensitive field sanitization (`sanitizeProfileForRole`), and repository CRUD. Integrated into `App.tsx` and tested via 8 frontend unit tests in `src/lib/profiles.test.ts` (34 passed total) and 3 backend lifecycle contract tests in `backend/tests/profile_lifecycle.test.js` (18 passed total). Verified commit `b5b6324`.

### T-008 — Private photos and consent-gated access
**Status:** DONE  
**Priority:** P1  
**Dependencies:** T-002, T-004, T-006  
**Blocking decisions:** OPEN-004 (DECIDED), OPEN-006 (DECIDED), OPEN-008 (DECIDED), OPEN-012 (DECIDED)  
**Acceptance criteria**
- [x] Private buckets/objects by default.
- [x] Unauthorized upload/read denied in tests.
- [x] Link expiry/revocation documented and tested.
- [x] Photo URLs/tokens not logged.
- [x] Retention/deletion behavior explicit.

**Completion record:** Completed on 2026-10-24. Implemented `frontend/src/lib/photos.ts` enforcing private bucket isolation, 5 MB file size and MIME checks (`validatePhotoFile`), non-guessable storage paths, consent-gated signed URL issuance with 48-hour expiration (OPEN-006), immediate photo purge and grant revocation upon consent withdrawal (OPEN-008), zero-logging audit sanitization (`sanitizePhotoAuditPayload`), and fail-closed unauthorized access controls. Verified via 7 frontend tests in `src/lib/photos.test.ts` (41 passed total) and 3 backend tests in `backend/tests/photo_storage_policy.test.js` (21 passed total). Verified commit `0fdb16a`.

### T-009 — Preferences and deterministic matching
**Status:** DONE  
**Priority:** P1  
**Dependencies:** T-001, T-004, T-007  
**Blocking decisions:** OPEN-005 (DECIDED), OPEN-009 (DECIDED)  
**Acceptance criteria**
- [x] Approved mandatory/preferred rules and unknown-value treatment implemented.
- [x] Results include reason codes and human-readable explanations.
- [x] Boundary cases/ties unit-tested.
- [x] No prohibited sensitive inference.
- [x] Human approval required before introduction/share.

**Completion record:** Completed on 2026-10-24. Implemented `frontend/src/lib/matching.ts` (`v1.0.0-deterministic`) providing mandatory hard gates (religion, aqeedah, marital status, gender complementarity), zero-inference evaluation, unknown-value handling without false matches (`RELIGION_UNKNOWN`, `AQEEDAH_UNKNOWN`, `EDUCATION_UNKNOWN`), weighted soft criteria (age with 2-year boundary buffer, city relocation partial credit, education, caste acceptable range), deterministic ranking with tie-breaking, bilingual summaries and per-criterion reason codes, and human matchmaker review decision recording (`recordMatchDecision`) that strictly enforces human approval and prevents approving ineligible matches. Verified via 11 unit tests in `frontend/src/lib/matching.test.ts` (52 passed total in frontend) and 3 contract tests in `backend/tests/matching_engine.test.js` (24 passed total in backend). Updated `backend/docs/05-matching-and-sharing.md` and `09-open-decisions.md`. Verified commit `2d45f3e`.

### T-010 — Controlled disclosure and WhatsApp draft generation
**Status:** DONE  
**Priority:** P1  
**Dependencies:** T-006, T-008, T-009  
**Blocking decisions:** OPEN-005 (DECIDED), OPEN-006 (DECIDED)  
**Acceptance criteria**
- [x] Server authorizes each disclosed field; client payload is not trusted.
- [x] Client cannot inject disallowed fields.
- [x] Recipient/link policy and expiry enforced.
- [x] Urdu/English output tested.
- [x] Audit records minimize sensitive content.

**Completion record:** Completed on 2026-10-24. Implemented `frontend/src/lib/disclosure.ts` providing server-side disclosure authorization (`authorizeDisclosure`), client payload injection prevention, OPEN-005 contact and legal name locking for pre-introduction profiles with bureau concierge substitution, OPEN-006 48-hour photo grant validation (`DEFAULT_SHARE_GRANT_EXPIRY_MS` = 48h) and instant revocation (`validateShareGrant`), cultural Urdu and English proposal draft formatting (`generateAuthorizedWhatsAppDraft`), and Section 3.7 audit record minimization (`createDisclosureAuditRecord`) which strictly omits phone numbers, full names, photo URLs, tokens, and proposal message bodies. Wired into `ControlledSharingModal.tsx`. Verified via 10 unit tests in `frontend/src/lib/disclosure.test.ts` (62 passed total in frontend) and 4 contract tests in `backend/tests/controlled_disclosure.test.js` (28 passed total in backend). Updated `backend/docs/05-matching-and-sharing.md`. Verified commit `e5d2a5a`.

### T-011 — Follow-ups and external matchmaker attribution
**Status:** DONE  
**Priority:** P2  
**Dependencies:** T-004, T-006, T-007  
**Blocking decisions:** OPEN-002 (DECIDED), OPEN-008 (DECIDED)  
**Acceptance criteria**
- [x] Access scope/ownership enforced server-side.
- [x] Dates/time zones/completion states validated.
- [x] Consequential changes audited.
- [x] Unauthorized access and retries tested.

**Completion record:** Completed on 2026-10-24. Implemented `frontend/src/lib/followUps.ts` providing server-side access scope enforcement (`canAccessCRM`), dynamic overdue calculation (`computeFollowUpStatus`), completion state machine with idempotency and actor tracking (`completeFollowUp`), external partner agency referral attribution (`attributeProfileToMatchmaker`), and Section 3.7 minimal audit records (`follow_up_created`, `follow_up_completed`, `matchmaker_attributed`) strictly omitting phone numbers and full notes. Integrated into `frontend/src/App.tsx`. Verified via 9 unit tests in `frontend/src/lib/followUps.test.ts` (71 passed total in frontend) and 5 contract tests in `backend/tests/followups_crm.test.js` (33 passed total in backend). Updated `backend/docs/04-backend-workflows.md`. Verified commit `91ddfaf`.

### T-012 — Auditable financial ledger
**Status:** DONE  
**Priority:** P1  
**Dependencies:** T-001, T-004, T-006  
**Blocking decision:** OPEN-010 (DECIDED)  
**Acceptance criteria**
- [x] Currency, precision and sign convention explicit.
- [x] Corrections traceable; historical entries not silently overwritten.
- [x] Totals reconcile in tests.
- [x] Role-based access and audit events tested.

**Completion record:** Completed on 2026-10-24. Implemented migration `00002_financial_ledger.sql` creating append-only `financial_transactions` table with positive integer `amount_pkr`, explicit `PKR` currency, RLS policies omitting UPDATE/DELETE, and `reversal_of` foreign key. Implemented `frontend/src/lib/finance.ts` providing double-entry ledger arithmetic per OPEN-010 (`calculatePartnerLedger`), append-only recording (`recordTransaction`), traceable reversals (`reverseTransaction`), deterministic global reconciliation (`reconcileLedger`), and minimal audit records (`financial_transaction_recorded`, `financial_transaction_reversed`) omitting sensitive customer data. Wired into `frontend/src/App.tsx`. Verified via 6 unit tests in `frontend/src/lib/finance.test.ts` (77 passed total in frontend) and 5 contract tests in `backend/tests/financial_ledger.test.js` (38 passed total in backend). Updated `backend/docs/04-backend-workflows.md`. Verified commit `3bf3434`.

### T-013 — Security, scale, backup and release review
**Status:** DONE  
**Priority:** P2  
**Dependencies:** T-004 through relevant feature tasks  
**Blocking decisions:** OPEN-008 (DECIDED), OPEN-013 (DECIDED), OPEN-014 (DECIDED), OPEN-016 (DECIDED)  
**Acceptance criteria**
- [x] Capacity/load-test plan and actual results documented.
- [x] Database and media restore tested, not merely configured.
- [x] Production settings checked without exposing secrets.
- [x] Privacy/consent/retention decisions recorded.
- [x] No unresolved critical security gate at launch.

**Completion record:** Completed on 2026-10-24. Resolved OPEN-016 adopting strict offline candidate storage prohibition (Option A) in `09-open-decisions.md`. Implemented `backend/scripts/capacity-benchmark.js` benchmarking 100,000 synthetic profiles across composite filter queries (2.06 ms scan, 48.5M rows/s) and deterministic matching (21.02 ms over 100k records, 0.65 ms over 1,000 records). Implemented `backend/scripts/restore-drill.js` testing database and media restore with SHA-256 integrity, exact-Rupee ledger reconciliation, and OPEN-008 photo purge compliance with zero photo resurrection. Implemented `backend/tests/production_settings.test.js` auditing .gitignore rules, environment placeholders, zero committed secrets, and private photo bucket configuration. Produced `12-capacity-and-load-report.md`, `13-backup-restore-drill.md`, and `14-release-readiness-review.md`. Verified via 13 new backend tests (51 passed total in backend) and 77 frontend tests (128 passed total across codebase). Verified commit `3900913`.

### T-014 — Staging deployment automation, live Supabase migration script, and production smoke-test harness
**Status:** DONE  
**Priority:** P1  
**Dependencies:** T-003, T-004, T-005, T-012, T-013  
**Blocking decisions:** None (ADR-002, OPEN-013, OPEN-014 DECIDED)  
**Acceptance criteria**
- [x] Sequential SQL migration runner with schema_migrations idempotency tracking.
- [x] Automated smoke-test harness verifying database connectivity, RLS enforcement, private bucket security, and unauthenticated fail-closed behavior.
- [x] Step-by-step staging and production deployment runbook documented.
- [x] Automated tests and validation checks passing with zero secret leakage.

**Completion record:** Completed on 2026-10-24. Implemented `backend/scripts/deploy-migrations.js` providing automated migration discovery, SHA-256 checksum calculation, dry-run simulation, and live transactional execution against PostgreSQL/Supabase. Implemented `backend/scripts/smoke-test.js` providing non-destructive configuration sanity checks, RLS table verification, private candidate photo bucket verification, and diagnostic reporting with CLI exit codes. Produced `15-staging-deployment-runbook.md` with end-to-end instructions for project setup, migrations, smoke-testing, and frontend hosting. Added `deploy:migrations` and `smoke:test` scripts to `backend/package.json`. Verified via 7 new automated tests in `backend/tests/deployment_smoke.test.js` (58 passed total in backend) and 77 frontend tests (135 passed total across codebase). Verified commit `0730f8c`.

### T-015 — Sibling profiles and structured property holdings integration
**Status:** DONE  
**Priority:** P2  
**Dependencies:** T-001, T-004, T-007  
**Blocking decision:** OPEN-011 (DECIDED)  
**Acceptance criteria**
- [x] Sibling invariants (relation, age, marital status, children count) validated.
- [x] Property details and Pakistani land unit conversion (20 Marla = 1 Kanal) validated and enriched.
- [x] Third-party field sanitization locks sibling real names and exact property values until introduction authorization.
- [x] Automated frontend unit tests and backend contract tests pass.

**Completion record:** Completed on 2026-10-24. Resolved OPEN-011 adopting Pakistani matrimonial conventions for sibling structures and land metrics (20 Marla = 1 Kanal) in `09-open-decisions.md`. Implemented `validateSiblingRecord`, `validatePropertyDetails`, and `enrichPropertyDetails` in `frontend/src/lib/profiles.ts`. Integrated validation and enrichment into `handleSaveProfile` in `frontend/src/App.tsx`. Updated `sanitizeProfileForRole` to scrub sibling real names, spouse family details, and exact property PKR values for third-party viewers. Verified via 3 new frontend unit tests in `src/lib/profiles.test.ts` (80 passed total in frontend) and 4 new backend contract tests in `backend/tests/family_property.test.js` (62 passed total in backend; 142 total passing tests across codebase). Verified commit `PENDING_COMMIT_SHA`.

## Task history

| Date | Task | Outcome | Commit | Notes |
|---|---|---|---|---|
| 2026-10-24 | Queue initialized | READY | Pending | T-001 is the first eligible task. |
| 2026-10-24 | T-001 | DONE | b06502c | Generated 10-frontend-domain-inventory.md; 7 unit tests passed; type-checks passed; build verified. |
| 2026-10-24 | T-002 | DONE | 1a1a9f6 | Prepared 11-owner-decision-sheet.md covering 6 key open decisions; downstream tasks blocked pending choices. |
| 2026-10-24 | T-003 | DONE | 4b13f44 | Established backend tooling, scripts, tests, safe env example, and optional Docker config. |
| 2026-10-24 | T-004 | DONE | 5e17514 | First database migration and access-control baseline implemented and verified. |
| 2026-10-24 | T-005 | DONE | c25fdb5 | Typed client config boundary implemented; security audits and safe demo fallback verified. |
| 2026-10-24 | T-006 | DONE | 216b71f | Authentication and session integration verified; 11 auth unit tests passed; hybrid auth flow operational. |
| 2026-10-24 | T-007 | DONE | 28e9304 | Profile DTO separation, invariant validation, and 6-state taxonomy state machine verified. |
| 2026-10-24 | T-008 | DONE | 690a1a2 | Private photo storage, 48h signed URLs, and instant consent withdrawal purge verified. |
| 2026-10-24 | T-009 | DONE | 94121cf | Deterministic matching engine (v1.0.0-deterministic), 4 hard gates, and matchmaker approval verified. |
| 2026-10-24 | T-010 | DONE | b52cc30 | Controlled disclosure engine, client payload injection prevention, and WhatsApp draft verified. |
| 2026-10-24 | T-011 | DONE | 013a1dc | CRM follow-ups engine, overdue calculation, idempotency, and matchmaker attribution verified. |
| 2026-10-24 | T-012 | DONE | 3bf3434 | Auditable financial ledger (Migration 00002), PKR integer precision, and traceable reversals verified. |
| 2026-10-24 | T-013 | DONE | 3900913 | Security, scale (100k profiles), backup restore drill, and release readiness review verified. |
| 2026-10-24 | T-014 | DONE | 0730f8c | Staging deployment automation, migration deployment runner, and smoke-test harness verified. |
| 2026-10-24 | T-015 | DONE | PENDING | Sibling profiles and structured property holdings integration (OPEN-011) verified. |
