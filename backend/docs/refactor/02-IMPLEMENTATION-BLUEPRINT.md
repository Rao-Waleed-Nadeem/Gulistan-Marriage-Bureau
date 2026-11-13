# 2. Implementation and Refactoring Blueprint

## 2.1 Objective and target architecture

Deliver the existing Gulistan product as a secure, persistent, maintainable application without changing SRS business meaning, source field meanings or established user workflows. Use incremental/strangler refactoring: retain React/Vite UI, replace local stores and simulated services one domain at a time, and keep compatibility adapters until parity tests pass.

Target flow:

React/Vite/TypeScript UI → typed application service boundary → trusted Supabase Edge Functions/SQL RPC → PostgreSQL with RLS + private Storage.

Frontend owns presentation state, not authoritative identity, roles, consent, lifecycle, matching decisions, sharing grants or finance. Trusted backend verifies JWT, looks up role from protected database, validates consent/status and performs atomic operations. No service-role key in browser.

## 2.2 Preserve source meaning

1. SRS and approved owner decisions define product semantics. Existing field names, meanings, states, screen flows and business rules are compatibility requirements.
2. Before type/schema changes, create source-to-target mapping: old field, target field, meaning, null/unknown semantics, migration and compatibility adapter.
3. Use additive ordered SQL migrations. Never edit a migration already applied in any shared environment.
4. Keep existing routes, design, bilingual behavior and 300-frame animation unless a scoped approved task requires change.
5. Never collapse distinct consent purposes, sibling details, partner fee models or property units.
6. Keep UUID primary keys separate from human-readable reference codes.
7. Never import mock records as real people or infer missing data.

## 2.3 Workstreams and order

### W0 — Repository baseline and authentication reconciliation (P0)
Confirm latest main and local changes. Verify the claimed auth implementation against source. Do not overwrite local/unpushed work. Integrate official Supabase Auth SDK; staff email/password and customer/family verified magic link per approved hybrid model. Map database matchmaker to product Nadeem. Implement trusted role provisioning, account status, session refresh, auth-state subscription, sign-out and recovery. Reconcile T-006 docs and record live staging evidence.
Gate: staff/customer test identities sign in/out; forged client role cannot access protected data; anon denied.

### W1 — Configuration and runtime boundaries (P0)
Explicit environment schema; separate dev/staging/prod. Missing/invalid production config or mock mode must fail. Public Vite variables contain only project URL and publishable/anon key. Service-role secret only in server secret store. Separate fixtures from production. Health distinguishes configuration, gateway, auth, DB and storage. Add secret scan and inspect bundle.

### W2 — Schema, migrations and repositories (P0)
Follow backend/docs/02-data-model.md and SRS. Evaluate normalized entities for user_profiles, user_roles, profiles, profile_private_details, profile_preferences, profile_siblings, profile_property_details, profile_consents, profile_photos, profile_status_history, match_cases, match_evaluations, match_criterion_results, match_decisions, share_grants, disclosure snapshots, external_matchmakers, matchmaker_agreements, follow_ups, financial accounts/transactions/postings/reversals, audit_events, app settings, import batches and row outcomes.
Each table needs UUID PK, FK, constraints, timestamps, workload-based indexes, RLS, explicit grants/policies and negative tests. Add typed repositories, lossless row/DTO adapters, pagination and idempotent server commands. No sensitive data in localStorage/sessionStorage/IndexedDB/CacheStorage per OPEN-016.

### W3 — Profile intake and data integrity (P0/P1)
Remove fact-like defaults: religion, aqeedah, caste, height, parent status, property, preferences, family notes, verification and photo permission. Model known/unknown/not-collected/not-disclosed/not-applicable as appropriate. Consent absent/false until explicit affirmative event. Enforce lifecycle in backend and record status history. Support assisted staff intake and self-service pending review without bypassing verification/approval. Persist structured siblings, spouse-family/children, property, units and settings. Persist correction requests. Add duplicate detection and human-reviewed merge.

### W4 — Consent, photos, privacy and sharing (P0)
Private bucket and storage policies. Trusted upload validates actual content/type/size and links photo to consent. Opaque non-identifying paths use cryptographic randomness. Persist metadata. Issue 48-hour default signed grants per OPEN-006, hash token at rest, fixed approved disclosure snapshot, expiry/revocation and rate limits. Every redemption rechecks current grant. Consent withdrawal blocks access and purges photos per OPEN-008. Implement inactive profile archive for one year then purge, and retention/audit rules. Client checkboxes only request disclosure; server decides. WhatsApp deep-link is not delivery/read proof.

### W5 — Matching and Nadeem review (P0/P1)
Deterministic matching works without AI. Use only stated/consented data and explicit criteria classifications. No default religion/aqeedah or hidden mandatory classification. Check eligible states, blocked/duplicate pairs, consent and freshness. Persist algorithm/config version, criteria, results, missing data, reasons, score and time. MatchReview displays persisted evaluation; remove hardcoded score 92 and fabricated explanations. Persist Nadeem approve/reject/defer with actor/time/reason. Re-check before sharing. AI remains blocked for candidate PII until OPEN-015 approved; AI never approves or shares.

### W6 — Matchmakers, CRM and finance (P1)
Persist external matchmakers and referral attribution. Version agreement terms per partner: fee model, basis, rates, effective dates, expiry and settlement rules. Persist follow-ups, due dates, completion actor/time/notes, reminders and audit. OPEN-010 approved formula is Net Balance = Total Receivable - Total Payable; align code/docs/tests and sign meaning. Owner/accountant must approve whether accounting is true double-entry or partner sub-ledger. Do not claim double-entry unless postings balance. Use safe integer/decimal PKR arithmetic, atomic settlements, reversals, idempotency and computed reconciliation.

### W7 — Frontend structure and UX preservation (P1/P2)
Refactor App.tsx into app shell and feature boundaries; typed query/command hooks; separate presentation/domain/repository/provider code. Keep routes, UI identity, Urdu/English, language persistence and animation. Remove fabricated health/activity/growth/verification metrics. Persist Admin settings. Android-first accessible layouts, RTL mixed-direction numbers/IDs/phones. Document requested three theme options without unapproved redesign.

### W8 — Staged migration from WhatsApp/gallery (P1)
Create canonical import templates and field mapping. Never indiscriminately scrape/import all chats/photos. Consent and source provenance required. Stages: source inventory, assisted extraction, dedupe/quarantine, human verification, dry-run, approved batch import, reconciliation/spot checks, close batch. Track source ref, checksum, actor, consent, mapping, conflict and row outcomes. No silent overwrite; conflict → review.

### W9 — Tests, scale, deployment and operations (P0/P1)
Replace smoke-test hardcoded success booleans with actual provider queries and negative tests. Distinguish unit/contract/local/staging/live tests. CI for lint/typecheck/tests/build/migrations/dependencies/secrets. Real staging Supabase. Benchmark actual DB with 100k active synthetic profiles and realistic concurrency, p50/p95/p99 and query plans. Actual isolated backup/PITR restore. Monitoring, privacy-safe logs, alerting, incident and recovery runbooks. Production only with owner approval.

## 2.4 File-level refactor map

| Existing path | Direction | Guardrail |
|---|---|---|
| frontend/src/App.tsx | App shell and feature composition | Preserve routes and workflows. |
| frontend/src/data/mockData.ts | Demo/test fixtures provider | Never seed production. |
| frontend/src/lib/auth.ts | Supabase Auth adapter + trusted role resolver | No fabricated session/client role. |
| frontend/src/lib/supabaseClient.ts | Typed browser client and health adapter | Public key only. |
| frontend/src/lib/config.ts | Explicit environment schema/modes | Production cannot silently demo. |
| frontend/src/lib/profiles.ts | Pure validation/mapping + repository/use cases | No fallback facts. |
| frontend/src/lib/photos.ts | Photo command client + trusted storage service | Private bucket/consent. |
| frontend/src/lib/disclosure.ts | Pure preview only | Authorization server-side. |
| frontend/src/lib/matching.ts | Pure deterministic engine + persisted orchestration | Explicit criteria. |
| frontend/src/features/matchmaker/MatchReview.tsx | Evaluation DTO and decision UI | No hardcoded score/reasons. |
| frontend/src/lib/followUps.ts | CRM repository/use cases | Persisted actor/time/idempotency. |
| frontend/src/lib/finance.ts | Money-safe calculations + persistent ledger | Correct formula/reconciliation. |
| frontend/src/features/admin/AdminPortal.tsx | Persisted settings/verified metrics | No fake save/health. |
| backend/migrations | Additive SQL migrations | Never rewrite applied migrations. |
| backend/scripts/smoke-test.js | Real provider checks | Simulation cannot report live pass. |

## 2.5 Dependency and stop rules
Order: W0 → W1 → W2 → W3 → W4 → W5 → W6 → W7 integration → W8 → W9. Independent UI work may proceed only if it does not depend on unresolved security/schema decisions.

Stop and mark BLOCKED for missing owner/legal/accounting/AI decisions, missing provider credentials/account access, destructive or ambiguous migrations, branch protection/concurrent changes, or unresolved privacy regression. Never call a workstream DONE because files exist; use acceptance matrix.
