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
**Status:** READY  
**Priority:** P1  
**Dependencies:** T-004, T-005, T-006  
**Blocking decisions:** OPEN-003 (DECIDED), OPEN-004 (DECIDED), OPEN-007, OPEN-011, OPEN-012  
**Scope:** After approval, start with staff profile create/read/update and pending review. Keep API DTOs separate from database rows.

**Acceptance criteria**
- [ ] Server validation and database constraints cover approved invariants.
- [ ] Role, ownership and lifecycle rules tested.
- [ ] Localized loading/error/empty/success states.
- [ ] Unauthorized callers cannot retrieve sensitive fields.
- [ ] Demo fixtures retained; no fabricated real data.

**Completion record:** Not started.

### T-008 — Private photos and consent-gated access
**Status:** BLOCKED  
**Priority:** P1  
**Dependencies:** T-002, T-004, T-006  
**Blocking decisions:** OPEN-004, OPEN-006, OPEN-008, OPEN-012  
**Acceptance criteria**
- [ ] Private buckets/objects by default.
- [ ] Unauthorized upload/read denied in tests.
- [ ] Link expiry/revocation documented and tested.
- [ ] Photo URLs/tokens not logged.
- [ ] Retention/deletion behavior explicit.

**Completion record:** Not started.

### T-009 — Preferences and deterministic matching
**Status:** BLOCKED  
**Priority:** P1  
**Dependencies:** T-001, T-004, T-007  
**Blocking decisions:** OPEN-005, OPEN-009  
**Acceptance criteria**
- [ ] Approved mandatory/preferred rules and unknown-value treatment implemented.
- [ ] Results include reason codes and human-readable explanations.
- [ ] Boundary cases/ties unit-tested.
- [ ] No prohibited sensitive inference.
- [ ] Human approval required before introduction/share.

**Completion record:** Not started.

### T-010 — Controlled disclosure and WhatsApp draft generation
**Status:** BLOCKED  
**Priority:** P1  
**Dependencies:** T-006, T-008, T-009  
**Blocking decisions:** OPEN-005, OPEN-006  
**Acceptance criteria**
- [ ] Server authorizes each disclosed field; client payload is not trusted.
- [ ] Client cannot inject disallowed fields.
- [ ] Recipient/link policy and expiry enforced.
- [ ] Urdu/English output tested.
- [ ] Audit records minimize sensitive content.

**Completion record:** Not started.

### T-011 — Follow-ups and external matchmaker attribution
**Status:** BLOCKED  
**Priority:** P2  
**Dependencies:** T-004, T-006, T-007  
**Blocking decisions:** OPEN-002, OPEN-008  
**Acceptance criteria**
- [ ] Access scope/ownership enforced server-side.
- [ ] Dates/time zones/completion states validated.
- [ ] Consequential changes audited.
- [ ] Unauthorized access and retries tested.

**Completion record:** Not started.

### T-012 — Auditable financial ledger
**Status:** BLOCKED  
**Priority:** P1  
**Dependencies:** T-001, T-004, T-006  
**Blocking decision:** OPEN-010  
**Acceptance criteria**
- [ ] Currency, precision and sign convention explicit.
- [ ] Corrections traceable; historical entries not silently overwritten.
- [ ] Totals reconcile in tests.
- [ ] Role-based access and audit events tested.

**Completion record:** Not started.

### T-013 — Security, scale, backup and release review
**Status:** BLOCKED  
**Priority:** P2  
**Dependencies:** T-004 through relevant feature tasks  
**Blocking decisions:** OPEN-008, OPEN-013, OPEN-014, OPEN-016  
**Acceptance criteria**
- [ ] Capacity/load-test plan and actual results documented.
- [ ] Database and media restore tested, not merely configured.
- [ ] Production settings checked without exposing secrets.
- [ ] Privacy/consent/retention decisions recorded.
- [ ] No unresolved critical security gate at launch.

**Completion record:** Not started.

## Task history

| Date | Task | Outcome | Commit | Notes |
|---|---|---|---|---|
| 2026-10-24 | Queue initialized | READY | Pending | T-001 is the first eligible task. |
| 2026-10-24 | T-001 | DONE | b06502c | Generated 10-frontend-domain-inventory.md; 7 unit tests passed; type-checks passed; build verified. |
| 2026-10-24 | T-002 | DONE | 1a1a9f6 | Prepared 11-owner-decision-sheet.md covering 6 key open decisions; downstream tasks blocked pending choices. |
| 2026-10-24 | T-003 | DONE | 4b13f44 | Established backend tooling, scripts, tests, safe env example, and optional Docker config. |
| 2026-10-24 | T-004 | DONE | 5e17514 | First database migration and access-control baseline implemented and verified. |
| 2026-10-24 | T-005 | DONE | c25fdb5 | Typed client config boundary implemented; security audits and safe demo fallback verified. |
