# Independent Repository Audit — 2026-11-15

**Repository:** `Rao-Waleed-Nadeem/Gulistan-Marriage-Bureau`  
**Branch:** `main`  
**Audit baseline:** `8c311ba72f3bc19ecec41815c4723781cf6f1e2a`  
**Audit type:** Source, schema, security-policy, repository/data-mapping, UI workflow, test, CI, operational-documentation and commit-history review.  
**Release verdict:** **NOT READY FOR REAL CUSTOMER DATA OR PRODUCTION.**  
**Code changes:** None in this audit; this document records findings and follow-up work only.

---

## 1. Executive verdict

The repository has substantially more implementation than the earlier prototype. It contains Supabase Auth client integration, a normalized schema proposal, typed repositories, deterministic matching, a finance module, CRM and partner modules, migration staging tables, test suites, CI, capacity scripts, restore scripts and operational documentation.

However, several task completion records overstate what the code actually does. The most important examples are:

- The migration runner reports live migrations as applied without connecting to or executing SQL against PostgreSQL.
- The photo and disclosure implementations remain client-memory simulations; no Storage API calls, share-grant persistence, or secure redemption endpoint were found.
- Core frontend repository methods use reference codes where the SQL schema requires UUIDs.
- The customer self-service and correction workflows conflict with actual RLS policies.
- The profile wizard still pre-populates candidate facts and household/property values.
- Several security invariants are enforced only in browser code and can be bypassed by direct Supabase REST calls.
- CI is green, but the current CI run runs a demo smoke-test, synthetic in-memory capacity benchmark and unit/contract tests—not a real Supabase migration, RLS, Storage, Edge Function, Android or end-to-end test.

**A successful TypeScript build and unit suite is not proof that the browser application works against the deployed schema.**

## 2. Scope and evidence limits

Reviewed the complete Git tree at the audit baseline (562 tracked blobs; tree response was not truncated), commit history returned by GitHub, all major frontend domain modules and their tests, all four SQL migrations, backend scripts and tests, the CI workflow, task queue, architecture/security/data-model/operations documentation, refactor programme, and relevant UI flows.

The critical paths examined include authentication, config, profile DTOs and repositories, database migrations and RLS, photo handling, disclosure, matching and decision persistence, CRM, partner agreements, finance/reversals, staged migration, customer portal, admin portal, CI, smoke testing, capacity benchmarking and backup/restore.

**Not performed:** No live Supabase credentials were available to this audit, so no live SQL migration, live RLS attack test, Storage upload/download/delete, real Auth callback, production email delivery, live backup/PITR restore, real 100,000-row PostgreSQL benchmark, or real Android device/browser test was performed. GitHub Actions run `43591601456` completed successfully, but its steps show a simulation-oriented pipeline described below.

Finding labels:
- **P0 — release blocker:** security, privacy, data integrity, core workflow or deployment correctness.
- **P1 — must fix before production:** important workflow, persistence, correctness, scale or operational gap.
- **P2 — hardening/documentation:** should be resolved before calling the product finished.

---

# 3. Confirmed P0 release blockers

## DEPLOYMENT AND DATABASE

### P0-01 — Live migration runner is a false-success implementation
**Evidence:** `backend/scripts/deploy-migrations.js`, `runMigrationDeployment()`.

The live branch sets mode to `LIVE_DATABASE_EXECUTION`, iterates pending migrations, and appends records with status `APPLIED`. It never opens a database connection and never executes a SQL file. The `databaseUrl` is only used to decide whether the script is in dry-run mode.

**Impact:** A successful deployment report can be produced while the database schema is unchanged. This is a critical false-success condition.

**Required fix:** Implement a real PostgreSQL/Supabase migration executor or use the official Supabase CLI migration workflow. Verify applied versions and checksums against a durable migration history table. A live run must fail if SQL was not executed and verified.

### P0-02 — No PostgreSQL driver or executable migration service is present
**Evidence:** `backend/package.json` has no PostgreSQL client dependency; `backend/scripts/deploy-migrations.js` has no connection/execution implementation.

**Impact:** The repository cannot currently perform the advertised direct PostgreSQL migration deployment through this script.

**Required fix:** Add and test a supported migration execution mechanism. Keep database passwords server-side and out of browser variables.

### P0-03 — Self-service profile creation is rejected by the database
**Evidence:** `frontend/src/lib/repositories.ts` → `ProfileRepositoryImpl.create()`; `backend/migrations/00001_initial_schema_baseline.sql` → `profiles_staff_insert`.

The repository explicitly allows authenticated customers to create profiles and forces `pending_review` / `direct_web`. The SQL policy only allows staff inserts. There is no customer INSERT policy on `public.profiles`.

**Impact:** Customer self-service intake works in demo-mode unit tests but is denied by real Supabase RLS.

**Required fix:** Design a narrowly scoped customer insert path that binds ownership to `auth.uid()`, forces pending status/source in the database (not only the client), validates consent and prevents customer-controlled sensitive fields/status.

### P0-04 — Consent schema contradicts the profile write path and defaults
**Evidence:** `backend/migrations/00001_initial_schema_baseline.sql`; `frontend/src/lib/profiles.ts` → `profileDTOToRow()`; `frontend/src/lib/repositories.ts` → `ProfileRepositoryImpl.create()`.

The original migration constrains `representative_consent_certified = TRUE`. The DTO mapper emits `false` when the value is absent. The migration also gives `candidate_consents.is_granted` a default of TRUE and a default certification timestamp.

**Impact:** Legitimate unconsented or not-yet-certified records are rejected or can receive false consent if the default is used. This is both a data-integrity and privacy problem.

**Required fix:** Use explicit consent events with explicit grant/withdrawal values; never default consent to true. Separate “unknown/not collected” from “granted”. Apply additive migration(s) and test all consent states against PostgreSQL.

### P0-05 — Profile lifecycle state machine is not enforced by the database
**Evidence:** `backend/migrations/00001_initial_schema_baseline.sql` → `profiles_staff_update`; `frontend/src/lib/repositories.ts` → `ProfileRepositoryImpl.updateStatus()`; `frontend/src/lib/profiles.ts` → `canTransitionStatus()`.

The client checks transition rules, but the database policy permits staff to update profiles without checking the old/new status pair. No trigger or trusted RPC enforces the transition graph. Status-history insertion is a separate client request and its error is not checked.

**Impact:** A staff user can bypass the lifecycle state machine through direct REST requests, and profile state can change without a corresponding history record.

**Required fix:** Move transition validation and history insertion into one transaction (trusted RPC/Edge Function/trigger) and deny direct status changes outside that operation.

### P0-06 — Match-case creation sends human reference codes to UUID columns
**Evidence:** `frontend/src/lib/repositories.ts` → `MatchRepositoryImpl.getOrCreateMatchCase()`; `backend/migrations/00003_complete_normalized_schema.sql` → `match_cases.profile_a_id/profile_b_id UUID`.

Application profile IDs are values such as `GLS-123` (the DTO maps `profiles.reference_code` to `ProfileRecord.id`). The repository inserts those strings directly into UUID foreign-key columns.

**Impact:** Real database match-case lookup/creation fails with UUID input/FK errors. Demo tests do not exercise this SQL type boundary.

**Required fix:** Resolve reference codes to profile UUIDs before persistence and map UUIDs/reference codes consistently on read/write.

### P0-07 — Photo upload, signed grants and deletion are in-memory only
**Evidence:** `frontend/src/lib/photos.ts`.

The module stores photo records and grant registries in JavaScript `Map` objects. `uploadPrivatePhoto()` accepts file metadata, not file bytes, and never calls Supabase Storage. `purgeCandidatePhoto()` only deletes from the in-memory map. Imports for the Supabase client/config do not result in Storage operations.

**Impact:** No real photo is uploaded, privately stored, signed, revoked or purged in Supabase. The application cannot safely handle actual candidate photographs.

**Required fix:** Implement private Storage bucket operations, real file upload, server-side consent validation, private object policies, signed URL issuance, deletion and revocation. Test anonymous, customer, staff, expired and withdrawn-consent cases against a real staging bucket.

### P0-08 — Controlled disclosure grants are not persisted or redeemable
**Evidence:** `frontend/src/lib/disclosure.ts`; `frontend/src/lib/photos.ts`; `backend/migrations/00003_complete_normalized_schema.sql`.

The disclosure module generates grants in client memory. It does not write/read/revoke `public.share_grants`. No `supabase/functions` source, secure-photo route, API handler, or `functions.invoke` implementation was found. The photo module constructs `https://gulistan.pk/secure-photo?... `, but no matching route/handler exists in the repository.

**Impact:** Generated links are not backed by durable authorization and have no implemented redemption endpoint. They cannot be considered secure, revocable, or operational.

**Required fix:** Implement trusted grant issue/redeem/revoke endpoints. Persist hashed token, expiry, recipient binding, profile/match reference and an immutable approved disclosure snapshot. The redemption endpoint must recheck consent/status and stream/redirect to a short-lived private Storage URL without exposing privileged credentials.

### P0-09 — Sharing modal can fabricate a Nadeem session and has an authorization fallback
**Evidence:** `frontend/src/components/matching/ControlledSharingModal.tsx`.

When there is no real Nadeem session, the modal constructs a synthetic authenticated `nadeem` session with `demo-staff-token`. If the controlled disclosure result has no snapshot, the modal falls back to `generateWhatsAppMessage(candidateData, ...)` using raw candidate fields.

**Impact:** The UI can generate an unrestricted draft without a real staff identity or successful controlled-disclosure decision. This bypasses the intended UI authorization gate. It is not a substitute for backend authorization.

**Required fix:** Remove synthetic staff identity from all production paths. If authorization fails, render no message and no copy/share action. Generate the message only from a server-authorized snapshot.

### P0-10 — Share operation does not enforce the persisted match approval
**Evidence:** `frontend/src/components/matching/ControlledSharingModal.tsx`; `frontend/src/lib/disclosure.ts`; `frontend/src/lib/matching.ts`.

The sharing modal calls `authorizeDisclosure(candidate, options, session)` without a match case, evaluation or persisted decision. The separate `verifyPreShareEligibility()` is not called by this modal. The disclosure function therefore cannot prove that the specific pair has a persisted Nadeem approval or mutual consent.

**Impact:** The intended “review and approve every suggestion before sharing” rule is not enforced at the share boundary.

**Required fix:** Make the server share endpoint require a specific match case and latest evaluation, verify the persisted Nadeem decision, both profiles’ current status and required consent events, then create the immutable snapshot.

### P0-11 — Customer correction request path cannot pass real authorization
**Evidence:** `frontend/src/features/customer/CustomerPortal.tsx`; `frontend/src/lib/repositories.ts` → `CRMRepositoryImpl.create()`; `backend/migrations/00003_complete_normalized_schema.sql` → `follow_ups_staff_manage`.

The portal submits a correction using `crmRepository.create(..., null)`. The repository's special case allows a null session in client logic, but the database CRM RLS policy is staff-only. The insert also omits `profile_id`, `match_case_id` and `assigned_to`.

**Impact:** The claimed persistent customer correction workflow is not functional against Supabase and the created follow-up is not linked to the profile.

**Required fix:** Create a dedicated customer correction request operation/table or a secure RPC that derives the caller and owned profile from the authenticated JWT. Never trust caller-supplied profile ownership.

### P0-12 — Customer consent toggles are local UI state only
**Evidence:** `frontend/src/features/customer/CustomerPortal.tsx`.

The photo and direct-contact toggles only update React state. No repository call or consent event is written. There is no persistent withdrawal action.

**Impact:** A customer can believe they withdrew consent while the system retains the prior database value and existing grants. Privacy promises are not met.

**Required fix:** Persist consent grant/withdrawal as auditable events; revoke active grants and purge affected media through trusted backend operations; update the UI only after server confirmation.

### P0-13 — Audit trail insertion can be forged by authenticated users
**Evidence:** `backend/migrations/00001_initial_schema_baseline.sql` → `audit_events_insert`.

The INSERT policy accepts `actor_id = auth.uid() OR actor_id IS NULL`. Any authenticated user can insert a row with a NULL actor ID and arbitrary actor role/action/details. The table has no server-generated actor binding or trusted insert-only function.

**Impact:** The audit trail is not a reliable evidentiary record; users can forge “system” events.

**Required fix:** Only allow inserts through a trusted server operation that derives actor ID/role from the verified JWT and restricts event types/targets. Disallow client-supplied NULL actor identity for authenticated events.

### P0-14 — Candidate PII is written to audit details
**Evidence:** `frontend/src/App.tsx` → `handleSaveProfile()`; `frontend/src/lib/repositories.ts` → `AuditRepositoryImpl.record()`.

The profile-save audit message includes full candidate name, age and occupation. The audit repository writes `logData.details` verbatim.

**Impact:** Candidate identifying/profile information is copied into an audit system intended to minimize PII.

**Required fix:** Use structured minimal metadata only (event type, internal ID, actor, timestamp, reason code). Add tests that reject names, phone numbers, contact details, message bodies and tokens in audit payloads.

### P0-15 — Assisted profiles are not linked to the customer who owns them
**Evidence:** `backend/migrations/00001_initial_schema_baseline.sql` → `profiles_customer_select_own`; `backend/migrations/00003_complete_normalized_schema.sql` → `user_profiles`; `frontend/src/lib/repositories.ts`.

Customer access is inferred from `profiles.created_by = auth.uid()`. For an assisted profile, `created_by` is the staff member, not the candidate/family account. There is no explicit owner/account-to-profile relationship in the schema.

**Impact:** A family account cannot reliably access its assisted profile, and “creator” is being used as “owner”.

**Required fix:** Add a separate explicit profile-owner/account link with controlled assignment and multiple authorized family representative support if required. Preserve `created_by` as provenance only.

### P0-16 — Suspended/pending user account status is not enforced during authentication
**Evidence:** `frontend/src/lib/auth.ts` → `fetchUserTrustedRole()` / `buildSessionFromProvider()`; `backend/migrations/00003_complete_normalized_schema.sql` → `user_profiles.account_status`.

Authentication checks `user_roles` only. It does not read or enforce `user_profiles.account_status`. A suspended or pending-verification account with a role can still be converted into an application session.

**Impact:** The schema's account-status control does not actually disable access.

**Required fix:** Enforce account status in a trusted auth/session bootstrap path and in relevant RLS policies. Add negative tests for suspended and pending accounts.

---

# 4. Confirmed P1 functional and data-integrity issues

## AUTHENTICATION AND CONFIGURATION

### P1-01 — Auth state callback performs awaited Supabase calls
**Evidence:** `frontend/src/lib/auth.ts` → `initAuth()`.

The `onAuthStateChange` callback is async and awaits database role lookup, then may call `supabase.auth.signOut()` from inside the callback. Supabase auth callbacks should not wait on further Supabase client operations inside the auth event lock.

**Impact:** Potential auth lock/deadlock or callback stalls during sign-in/token refresh. This requires browser integration testing.

**Required fix:** Keep the callback synchronous; enqueue role/session resolution outside the callback with race-safe event/session versioning.

### P1-02 — Staging can silently fall back to demo mode
**Evidence:** `frontend/src/lib/config.ts` → `validateClientConfig()`.

Missing/placeholder credentials return valid demo mode for any non-production environment, including `staging`. The stated T-020 scope says demo fallback is development-only.

**Impact:** A staging deployment can display synthetic data while appearing to be a staging application.

**Required fix:** Allow automatic demo fallback only for explicit development. Staging must fail hard when backend configuration is absent or mock mode is enabled.

### P1-03 — Unknown environment labels silently become development
**Evidence:** `frontend/src/lib/config.ts`.

An unrecognized `VITE_APP_ENV` is coerced to `development`.

**Impact:** A typo such as `prod` can disable production safety rules and allow demo-mode fallback.

**Required fix:** Reject unknown environment labels; do not coerce them.

### P1-04 — Non-local HTTP Supabase URLs are accepted
**Evidence:** `frontend/src/lib/config.ts`.

Backend URL validation accepts both `http:` and `https:` for all environments.

**Impact:** A production URL configured with HTTP can expose bearer tokens and candidate data in transit.

**Required fix:** Require HTTPS outside explicit localhost development.

### P1-05 — Health status overstates actual service availability
**Evidence:** `frontend/src/lib/config.ts`; `frontend/src/lib/supabaseClient.ts`.

A valid config marks Auth, database and Storage healthy before those services are probed. The health check pings REST only and treats HTTP 401 as evidence of a healthy database; Auth and Storage are not independently checked.

**Impact:** Admin/owner may see “healthy” even when authentication, SQL policies or Storage are broken.

**Required fix:** Distinguish configured from operational. Probe Auth, a harmless database query and Storage independently; never label a service healthy without an actual service-specific check.

### P1-06 — CI secret scan is too narrow
**Evidence:** `.github/workflows/ci.yml`.

The check searches tracked env filenames and greps only `VITE_.*SERVICE_ROLE` under `frontend/src/`. It is not a full repository secret scan and does not cover all secret-like values or generated assets.

**Impact:** A secret can be committed in another path or variable name without this CI step detecting it.

**Required fix:** Add a maintained secret scanner over the entire repository and history as appropriate, allowlist only known placeholders, and fail on live credentials.

### P1-07 — Default Supabase auth persistence uses browser local storage
**Evidence:** `frontend/src/lib/supabaseClient.ts` → `createClient()` auth options; OPEN-016 in `backend/docs/09-open-decisions.md`.

The client enables `persistSession: true` without a custom storage adapter. Supabase's browser client persists auth session material in browser storage, while the project's storage invariant/test language treats token persistence as forbidden.

**Impact:** The implemented storage behavior and documented offline-storage rule are inconsistent. This needs an explicit threat-model decision and test.

**Required fix:** Decide the permitted session storage model, implement it deliberately, and update tests/docs. Never cache candidate PII or private records.

## PROFILE DATA AND REPOSITORY MAPPING

### P1-08 — Profile wizard still manufactures candidate facts
**Evidence:** `frontend/src/features/matchmaker/ProfileWizard.tsx`.

The form initializes gender to female, age to 24, height to 5'4", marital status to never married, property ownership to owned, property type to house, area to 0 Marla and household arrangement to independent. It also pre-populates preference age ranges and marital status. Adding a sibling initializes age 24 and never-married status.

**Impact:** Staff can submit an unverified profile with fabricated personal/family/property facts. This contradicts T-022's “no fabricated defaults” completion claim.

**Required fix:** Use explicit Unknown/Not collected/Not disclosed/Not applicable values or blank required inputs. Do not create a property row unless actual property details were supplied.

### P1-09 — DTO fallback still fabricates a property object
**Evidence:** `frontend/src/lib/profiles.ts` → `profileRowToDTO()`.

When no property row exists, the mapper constructs a property object with `propertyType: 'house'`, `ownership: 'other'`, `areaMarlas: 0` and `householdArrangement: 'independent'`.

**Impact:** Missing property data becomes a concrete house/independent household representation in UI and metrics.

**Required fix:** Represent absent property details as absent/unknown, not a populated property object.

### P1-10 — Nested database DTOs are not mapped from snake_case to camelCase
**Evidence:** `frontend/src/lib/repositories.ts` → profile `findById/findAll`; `frontend/src/lib/profiles.ts` → `profileRowToDTO()`.

Raw Supabase rows from `profile_preferences`, `profile_siblings` and `profile_property_details` are passed directly as domain DTOs. The SQL fields are snake_case (for example `age_min`, `area_marlas`, `marital_status`), while React/domain types use camelCase (for example `ageMin`, `areaMarlas`).

**Impact:** Reloaded records lose/misread nested values; tests using camelCase demo objects do not prove database round-trip correctness.

**Required fix:** Add explicit row-to-DTO and DTO-to-row converters for every child entity, with PostgreSQL integration round-trip tests.

### P1-11 — Preferences persistence is incomplete and has a type mismatch
**Evidence:** `frontend/src/lib/repositories.ts` → profile create; `backend/migrations/00003_complete_normalized_schema.sql` → `profile_preferences`.

The repository inserts only some preference fields and omits height bounds, education, occupations, cities, property expectation, family arrangement and lifestyle notes. It sends `preferences.maritalStatus` as an array while the SQL column is `VARCHAR(30)`.

**Impact:** Preferences are partially lost or rejected by PostgREST due to type mismatch.

**Required fix:** Align schema and TypeScript types, persist every approved field and validate values at the database boundary.

### P1-12 — Sibling and property persistence is lossy
**Evidence:** `frontend/src/lib/repositories.ts` → `ProfileRepositoryImpl.create()`.

Sibling inserts omit education, marriage details and spouse-family details. Property inserts omit estimated value and other fields. The return path uses in-memory objects, masking database read-back problems.

**Impact:** The family/property data model is not faithfully persisted despite the “lossless mapping” completion claim.

**Required fix:** Map every SRS/OPEN-011 field and add database round-trip tests. Do not default unknown children count to zero unless “no children” was explicitly confirmed.

### P1-13 — Profile create is not transactional
**Evidence:** `frontend/src/lib/repositories.ts` → `ProfileRepositoryImpl.create()`.

The parent profile is inserted first; preferences, property and siblings are inserted in separate requests. Child insert errors are not checked.

**Impact:** A profile can appear successfully created while its preferences, property or sibling rows failed, leaving partial data.

**Required fix:** Use a single trusted transactional RPC/Edge Function for parent and child writes, returning success only after all writes commit.

### P1-14 — Generated profile reference codes can collide
**Evidence:** `frontend/src/lib/profiles.ts` → `profileDTOToRow()`.

The fallback reference code uses the last four digits of `Date.now()`.

**Impact:** Concurrent registrations can generate duplicate reference codes.

**Required fix:** Generate collision-resistant IDs server-side and enforce unique constraints; retry safely on conflict.

### P1-15 — Customer portal selects the first profile rather than resolving ownership
**Evidence:** `frontend/src/App.tsx` → `CustomerPortal currentProfile={profiles[0] || null}`.

The portal takes the first row returned. It does not resolve a durable owner-to-profile relation.

**Impact:** The wrong profile can be displayed when a user has multiple linked profiles or ordering changes; assisted profiles are not reliably linked.

**Required fix:** Resolve the signed-in user's explicit profile ownership links and handle multiple profiles deliberately.

### P1-16 — Backend customer recommendations are always empty
**Evidence:** `frontend/src/App.tsx`.

Recommendations are initialized from `INITIAL_RECOMMENDATIONS` only in demo mode; backend mode sets them to an empty array. Customer RLS on `match_cases`, `match_evaluations` and `match_decisions` is staff-only.

**Impact:** The customer portal cannot show approved persisted recommendations in backend mode.

**Required fix:** Implement a privacy-filtered customer-facing approved-introduction query/endpoint that exposes only the exact authorized snapshot/fields.

### P1-17 — Preference editor reports success without saving
**Evidence:** `frontend/src/features/customer/CustomerPortal.tsx`.

The “Update Preferences” action calls `alert('Preferences saved!')`; it does not call a repository or persist data.

**Impact:** Users receive false success feedback and their preferences are lost.

**Required fix:** Wire a real authorized preference update operation and only show success after server confirmation.

### P1-18 — Repository errors are silently converted to empty data in several paths
**Evidence:** `frontend/src/lib/repositories.ts` (profile, finance, CRM, matchmaker read methods).

Several Supabase query paths return `[]` or `null` when `error` is present, rather than surfacing the failure.

**Impact:** A broken permission/schema/network query can look like “no profiles/no transactions/no follow-ups”. This hides deployment defects and may lead to incorrect decisions.

**Required fix:** Preserve and surface typed query errors; distinguish true empty results from failed requests.

### P1-19 — Registry reads are unpaginated
**Evidence:** `frontend/src/lib/repositories.ts` → `ProfileRepositoryImpl.findAll()`; `frontend/src/hooks/useProfiles.ts`.

The query fetches all visible profiles and nested data without pagination/range or server-side search. The staff dashboard loads this hook for the whole registry.

**Impact:** The stated 100,000+ active-profile requirement is not proven. The browser may load the entire candidate registry, including sensitive staff-only fields, causing latency, memory and data-exposure concerns.

**Required fix:** Implement server-side pagination, minimal column selection, indexed filters, cursor pagination and bounded result sizes. Matching should run on an appropriately scoped backend query, not download the whole registry.

## MATCHING AND DISCLOSURE

### P1-20 — Approval can be recorded when no evaluation exists
**Evidence:** `frontend/src/lib/repositories.ts` → `MatchRepositoryImpl.recordDecision()`.

The code blocks approval only when `latestEval` exists and `mandatory_satisfied` is false. If no evaluation exists, it proceeds with approval.

**Impact:** A match can be approved without any persisted eligibility evaluation.

**Required fix:** Require a latest evaluation to exist, be current, be mandatory-satisfied and match the current profile versions before approval.

### P1-21 — Match approval and match-case status update are not atomic
**Evidence:** `frontend/src/lib/repositories.ts` → `MatchRepositoryImpl.recordDecision()`.

The decision insert and match-case status update are separate requests. The status update result is not checked.

**Impact:** The decision may be persisted while case status remains unchanged, or the UI may report approval with inconsistent state.

**Required fix:** Perform both in one server transaction; verify actor identity and write an immutable decision.

### P1-22 — Approval identity is not constrained to Nadeem at the database boundary
**Evidence:** `backend/migrations/00003_complete_normalized_schema.sql` → `match_decisions_staff_manage`, `match_cases_staff_manage`; `frontend/src/lib/repositories.ts`.

Database policies allow any staff role to manage match cases/decisions. The client also treats Admin as allowed for Nadeem-level operations.

**Impact:** The strict project rule that Nadeem personally reviews/approves every suggestion is not enforced by the database.

**Required fix:** Encode the exact approved authority model in server policies and decision procedures. If Admin override is permitted, it must be an explicit, audited exception, not silent equivalence.

### P1-23 — Match-case uniqueness does not prevent reversed duplicate pairs
**Evidence:** `backend/migrations/00003_complete_normalized_schema.sql` → `uq_match_case_pair`.

The unique constraint is on `(profile_a_id, profile_b_id)`; the repository searches both orientations but inserts whichever order it receives.

**Impact:** Concurrent/reversed calls can create both (A,B) and (B,A) cases.

**Required fix:** Canonicalize pair ordering server-side or enforce an unordered-pair uniqueness strategy.

### P1-24 — Match decision state is not restored into evaluation DTO
**Evidence:** `frontend/src/lib/repositories.ts` → `getCaseHistory()/saveEvaluation()`; `frontend/src/lib/matching.ts` → `verifyPreShareEligibility()`.

Pre-share validation expects `evaluation.humanDecisionStatus === 'approved_by_nadeem'`. The SQL `match_evaluations` table does not contain that field; decisions are stored separately and `getCaseHistory()` maps them separately without rebuilding the evaluation approval state.

**Impact:** After reload, an already approved evaluation may be reconstructed as pending and fail pre-share validation, or UI code may depend on transient local state.

**Required fix:** Derive authorization from persisted `match_cases.status` and the latest `match_decisions` record, not a transient evaluation property.

## PHOTOS, CONSENT AND SHARING

### P1-25 — No Storage object policies are defined in the migrations
**Evidence:** all four files under `backend/migrations/`.

The migrations enable RLS on relational `profile_photos` metadata but do not define policies on `storage.objects` or create/verify a private Storage bucket.

**Impact:** Relational metadata policy does not secure the actual image object store.

**Required fix:** Add bucket setup and least-privilege `storage.objects` policies, then prove anonymous/customer unauthorized reads and deletes are denied.

### P1-26 — Photo display maps a storage path to an image URL
**Evidence:** `frontend/src/lib/repositories.ts` profile read mapping; `frontend/src/components/ui/ProfileCard.tsx`; `frontend/src/components/ui/ProfileDetailModal.tsx`.

The repository maps `profile_photos.storage_path` directly to `photoUrl`, while the UI uses it as an `img src`. A storage path is not a signed URL.

**Impact:** Real private images will not display, or developers may be tempted to make the bucket public to “fix” the image.

**Required fix:** Resolve photo display through a short-lived authorized signed URL service; never expose raw bucket paths as public image URLs.

### P1-27 — Share grant schema does not store the claimed fixed snapshot/match binding
**Evidence:** `backend/migrations/00003_complete_normalized_schema.sql` → `share_grants`.

The table stores `profile_id`, token hash, recipient fields, approved field names and expiry. It has no `match_case_id` or complete immutable disclosed-data snapshot.

**Impact:** The database cannot independently prove exactly what was approved/shared for a particular pair at issue time.

**Required fix:** Persist match-case ID, recipient binding and the exact approved snapshot/version. Keep raw token out of storage/logs.

### P1-28 — Privacy erasure only touches the demo photo map
**Evidence:** `frontend/src/lib/photos.ts` → `executeCandidatePrivacyErasure()`, `purgeCandidatePhoto()`.

The operation does not delete real Storage objects, revoke database share grants, update consent records or carry out a profile retention/deletion workflow. It only calls the in-memory photo purge.

**Impact:** The privacy-erasure function name overstates the actual deletion performed.

**Required fix:** Implement a server-side erasure workflow with transaction/outbox semantics, Storage deletion, grant revocation, audit, retention/legal hold rules and post-operation verification.

### P1-29 — Bureau office contact is an explicit placeholder
**Evidence:** `frontend/src/lib/disclosure.ts`.

The office number is `+92 300 0000000` and `IS_BUREAU_OFFICE_PHONE_CONFIGURED = false`.

**Impact:** The fallback contact cannot be used in a real customer communication.

**Required fix:** Owner must provide and verify the official number; configuration should remain disabled until then.

## CRM AND EXTERNAL MATCHMAKERS

### P1-30 — CRM profile linkage is not persisted
**Evidence:** `frontend/src/lib/repositories.ts` → `CRMRepositoryImpl.create()`; `backend/migrations/00003_complete_normalized_schema.sql` → `crm_follow_ups.profile_id UUID`.

The backend insert omits `profile_id`, `match_case_id` and `assigned_to`. The code also uses profile reference codes in other CRM paths while the SQL column is UUID.

**Impact:** Follow-ups cannot be reliably linked, filtered or reported against the correct profile/match.

**Required fix:** Resolve reference code to UUID and persist linkage plus assigned staff in a transactional CRM operation.

### P1-31 — CRM fallback values fabricate contact identity
**Evidence:** `frontend/src/lib/repositories.ts` → `CRMRepositoryImpl.create()`.

The repository supplies fallback person/phone/profile values such as “Candidate Representative”, `+92 300 0000000` and `GLS-101`.

**Impact:** Missing CRM data becomes fabricated contact information and can lead to calls/messages to the wrong party.

**Required fix:** Require validated contact/profile linkage or explicitly store unknown/not supplied. Never invent phone numbers or profile references.

### P1-32 — Matchmaker code is used where database UUID is required
**Evidence:** `frontend/src/lib/repositories.ts` → `MatchmakerRepositoryImpl.findAll()`, `createAgreement()`, `getAgreements()`, `attributeReferral()`; `backend/migrations/00003_complete_normalized_schema.sql`.

The backend mapping sets `id: d.code || d.id`, so application `mm.id` becomes the human code. Agreement operations then use that value for SQL `matchmaker_id UUID`.

**Impact:** Creating/loading agreements can fail with invalid UUID or return no rows. Referral update also filters by this code against UUID `id`.

**Required fix:** Preserve the UUID as `id` and map the human partner code to a separate `code` property throughout the UI and repository.

### P1-33 — Tiered partner commission model is not represented in the SQL agreement table
**Evidence:** `frontend/src/lib/repositories.ts`; `backend/migrations/00003_complete_normalized_schema.sql`.

The repository claims percentage, flat-fee and tiered models, but `matchmaker_agreements` has no tiered rules JSON column and the insert does not persist `tieredRulesJson`.

**Impact:** Tiered terms are lost or only represented as free text.

**Required fix:** Add validated structured tier rules and effective-date/overlap constraints; test calculations for all agreement types.

### P1-34 — Referral attribution only increments a counter
**Evidence:** `frontend/src/lib/repositories.ts` → `attributeReferral()`.

The backend path updates `external_matchmakers.referral_count`; it does not use `profileId` or `notes` to persist a referral relationship. The read-modify-write counter is also non-atomic.

**Impact:** There is no durable evidence of which partner referred which profile; counts can be lost under concurrency.

**Required fix:** Add a referral attribution table with profile UUID, partner UUID, source, actor, timestamp, notes and uniqueness/idempotency.

## FINANCE

### P1-35 — Reversal references mix database UUID and human transaction reference
**Evidence:** `frontend/src/lib/repositories.ts` → `FinanceRepositoryImpl.reverse()/findAll()`; `frontend/src/lib/finance.ts` → `reconcileLedger()`.

The database reversal row stores `reversal_of: original.id` (UUID), while the application transaction ID is generally `reference_code`. The repository maps the database UUID into `reversalOf` but maps transaction `id` to the reference code. Reconciliation looks up reversal target IDs against the reference-code map.

**Impact:** A valid database reversal is likely reported as referring to a nonexistent transaction.

**Required fix:** Use one canonical database UUID for all foreign-key relations and separately expose the human reference code.

### P1-36 — Duplicate reversal is not prevented atomically
**Evidence:** `frontend/src/lib/repositories.ts` → `FinanceRepositoryImpl.reverse()`; `backend/migrations/00002_financial_ledger.sql`.

The backend inserts a reversal but does not update/lock the original row and does not enforce a unique reversal per original transaction. The check reads the original status, which remains unchanged under the append-only design.

**Impact:** Concurrent/repeated requests can create multiple reversals for one transaction.

**Required fix:** Use an atomic server operation with row locking/idempotency and a database uniqueness/chain rule.

### P1-37 — Paid/received transaction types default to pending in the repository
**Evidence:** `frontend/src/lib/repositories.ts` → `FinanceRepositoryImpl.record()`.

The repository sets `status: txData.status || 'pending'` for all transaction types, while the domain finance helper treats `paid` and `received` as settled by default.

**Impact:** Settlements may be recorded as pending and omitted from settled totals.

**Required fix:** Validate transaction type/status combinations centrally and enforce them in the database.

### P1-38 — Reconciliation is not a true double-entry balance proof
**Evidence:** `frontend/src/lib/finance.ts`; `backend/migrations/00002_financial_ledger.sql`; `backend/docs/09-open-decisions.md`.

The current model is a partner clearinghouse sub-ledger with payable/receivable/paid/received/reversal transaction types, not a general journal with debit/credit postings. The reconciliation function checks amounts/currency/reversal relationships, but does not prove balanced debit/credit postings.

**Impact:** Documentation and task claims that it mathematically proves a double-entry ledger are stronger than the implemented model.

**Required fix:** Preserve the owner-approved clearinghouse model, but describe it accurately and define settlement links/posting rules. If true double-entry accounting is required, implement journal entries and balanced debit/credit constraints with accountant approval.

## STAGED DATA MIGRATION

### P1-39 — Staging engine does not use the new migration tables
**Evidence:** `frontend/src/lib/migration.ts`; `backend/migrations/00004_staged_migration_batches.sql`.

The TypeScript batch and staged-record stores are module-level arrays. The code does not persist `migration_batches` or `migration_staged_records`.

**Impact:** Refresh/restart loses batches, staged records, owner approvals and provenance. The database migration creates tables that the application does not use.

**Required fix:** Implement persistent batch/record repositories and make all state transitions durable.

### P1-40 — Importer fabricates candidate facts
**Evidence:** `frontend/src/lib/migration.ts` → `executeBatchImport()`.

Missing values are filled with defaults including male, age 25, 5'6", never married, Islam, Sunni, Other caste, Bachelors, General education, Private Sector, Employee and Lahore.

**Impact:** Imported WhatsApp/gallery records can be transformed into false candidate biodata.

**Required fix:** Preserve missing/unknown values and quarantine records when required fields are absent. Never manufacture demographics or consent.

### P1-41 — Import “merge_update” does not merge
**Evidence:** `frontend/src/lib/migration.ts` → `resolveQuarantinedRecord()` and `executeBatchImport()`.

The `merge_update` action sets a record to approved, but the import function always calls `profileRepository.create()`.

**Impact:** A duplicate marked for merge creates another profile instead of updating the existing record.

**Required fix:** Implement an explicit conflict-targeted merge with field-level review, immutable before/after audit and transactional optimistic concurrency.

### P1-42 — Batch import is not atomic
**Evidence:** `frontend/src/lib/migration.ts` → `executeBatchImport()`.

Records are inserted in a loop through separate repository calls. There is no transaction, durable batch lock or idempotency key. Failure partway through leaves partial imports.

**Impact:** Batch status/counts can disagree with actual profiles.

**Required fix:** Execute import in one server transaction or resumable idempotent chunks with durable per-row states and exact reconciliation.

### P1-43 — Consent parser treats text mentions as consent proof
**Evidence:** `frontend/src/lib/migration.ts` → `parseWhatsAppChatExport()`, `evaluateDeduplicationAndQuarantine()`.

Consent is inferred by text detection and then assigned to candidate/representative consent fields. The evaluator rejects only when both consent booleans are false (`&&`), rather than requiring each necessary consent to be independently verified.

**Impact:** A generic mention of “consent” can be mistaken for legal candidate authorization; one missing consent field may pass.

**Required fix:** Require explicit, attributable, purpose-specific evidence and reviewer confirmation. Test both booleans independently; no regex can certify legal consent.

### P1-44 — Gallery migration metadata is not a photo import
**Evidence:** `frontend/src/lib/migration.ts` → `parsePhoneGalleryMetadata()`.

The parser builds metadata and a path string but does not read/upload actual file bytes to private Storage. Its source checksum is derived from filename and size rather than the file contents.

**Impact:** Gallery records may be marked staged without a verified asset or content-integrity check.

**Required fix:** Import the actual selected files through the secure upload service and hash file bytes. Store consent and provenance per photo.

### P1-45 — Reconciliation checksum check only checks string length
**Evidence:** `frontend/src/lib/migration.ts` → `reconcileMigrationBatch()`.

It sets `checksumVerified` based on `batch.sourceChecksum.length === 64`; it does not recompute the source checksum and compare it.

**Impact:** A wrong/tampered source can be reported as checksum verified.

**Required fix:** Recompute SHA-256 from the source bytes and compare to the stored digest.

### P1-46 — Migration rollback is not a true rollback
**Evidence:** `frontend/src/lib/migration.ts` → `rollbackMigrationBatch()`.

Rollback changes imported profile status to restricted and updates in-memory batch state. It does not reverse child rows, source staging records, storage objects or database batch status; errors are caught and the operation continues.

**Impact:** Partial rollback can be reported as complete and imported data remains in the database.

**Required fix:** Implement a durable rollback/reversal workflow with per-row outcomes, no swallowed failures, data-retention policy and exact verification.

### P1-47 — Raw WhatsApp source content is stored as plaintext in migration schema
**Evidence:** `backend/migrations/00004_staged_migration_batches.sql` → `migration_staged_records.raw_content`.

The staging table stores full raw content in a TEXT column.

**Impact:** Full conversations can contain phone numbers, family details, photos/links and unrelated third-party personal information. RLS alone does not address retention, minimization or encryption requirements.

**Required fix:** Store only the minimum extracted fields required; encrypt sensitive raw source artifacts in private storage, restrict access, define short retention and purge source material after reconciliation.

---

# 5. P1 test, scale and operational evidence gaps

### OPS-01 — CI does not test against a real PostgreSQL/Supabase database
**Evidence:** `.github/workflows/ci.yml`; `backend/tests/migration_00003.test.js`; `backend/tests/migration_00004.test.js`.

Migration tests inspect SQL strings/regexes. No PostgreSQL instance is started and no migrations are replayed against an actual database.

**Impact:** SQL syntax, foreign keys, grants, policy behavior and PostgREST type mappings can be wrong while CI stays green.

**Required fix:** Add ephemeral PostgreSQL/Supabase local integration tests that apply every migration from an empty database and execute role-based positive/negative CRUD tests.

### OPS-02 — Security role-matrix tests use local fake functions
**Evidence:** `backend/tests/security_role_matrix.test.js`.

The role-matrix tests create mock sessions and local helper functions; they do not send requests to actual RLS-protected tables or endpoints.

**Impact:** They prove the helper functions reject sample inputs, not that database policies enforce the same boundary.

**Required fix:** Add actual JWT-backed RLS integration tests for anonymous, customer, matchmaker and admin roles, including direct REST attempts to bypass client logic.

### OPS-03 — Live smoke test can report false security success
**Evidence:** `backend/scripts/smoke-test.js`.

The anonymous profile probe treats HTTP 200, 401 or 403 as success without inspecting the response body. A 200 response containing protected profile rows can therefore be treated as a successful negative probe. In “live” mode, `validateSecurityBaseline()` returns true for every required table without querying its policies, and `validateStorageSecurity()` returns all security properties as true without making a Storage API call.

**Impact:** A false “LIVE_STAGING_VERIFIED” can be produced without proving RLS or Storage privacy.

**Required fix:** Inspect returned rows and run explicit anonymous/customer/staff negative probes per table and bucket. Never hardcode live results.

### OPS-04 — Current CI smoke test is explicitly simulation-only
**Evidence:** `.github/workflows/ci.yml`.

CI invokes `node backend/scripts/smoke-test.js --demo`.

**Impact:** A green CI result does not show that a Supabase project is reachable or that RLS/Storage/Auth works.

**Required fix:** Keep simulation tests, but add a separately gated staging integration workflow using dedicated staging credentials and explicit evidence.

### OPS-05 — 100k capacity benchmark is in-memory JavaScript, not PostgreSQL
**Evidence:** `backend/scripts/capacity-benchmark.js`; `backend/tests/capacity_benchmark.test.js`; `backend/docs/12-capacity-and-load-report.md`.

The benchmark creates synthetic arrays, filters them in JavaScript and returns hardcoded query-plan descriptions. It does not execute SQL, inspect real PostgreSQL EXPLAIN plans or measure Supabase concurrency.

**Impact:** The 100,000-profile requirement has not been demonstrated against the actual database or application.

**Required fix:** Benchmark a real 100k synthetic PostgreSQL dataset, capture EXPLAIN ANALYZE, indexes, p50/p95/p99, query counts, payload sizes, memory and concurrent workloads.

### OPS-06 — Backup/restore drill is an in-memory simulation
**Evidence:** `backend/scripts/restore-drill.js`; `backend/tests/backup_restore.test.js`; `backend/docs/13-backup-restore-drill.md`.

The script creates synthetic JavaScript objects and copies them. Its PITR function replays only a small subset of inserts; it does not restore a Supabase backup, WAL stream or Storage bucket.

**Impact:** The documentation's “TESTED & VERIFIED” and RTO/RPO claims are not live restore evidence.

**Required fix:** Rename current test as simulation; perform and record a real isolated Supabase database restore and private-media recovery drill.

### OPS-07 — Release-readiness document overstates approval
**Evidence:** `backend/docs/14-release-readiness-review.md`.

It declares “COMPLETED & APPROVED FOR PILOT LAUNCH” and the 2026-11-14 addendum claims all gates are complete, while the same release checklist still requires owner setup and live provider operations. The code audit shows the core gaps in this report.

**Impact:** A reader may mistake unit/simulation completion for pilot approval.

**Required fix:** Mark release status NOT APPROVED until every live gate is evidenced and owner acceptance is recorded.

### OPS-08 — Incident runbook SQL does not match the schema
**Evidence:** `backend/docs/16-monitoring-and-incident-runbook.md`.

The runbook updates `share_grants.status` and filters by `candidate_profile_id`, but the actual table has `is_revoked` and `profile_id`. The example may fail against the actual schema.

**Impact:** During a privacy incident, the documented revocation command can fail.

**Required fix:** Reconcile every runbook SQL statement against the latest migrations and test it on staging.

### OPS-09 — Root agent instructions conflict with the current approved architecture
**Evidence:** `AGENTS.md`.

It still calls Supabase “PROPOSED” and says backend functions are to be implemented, while the current decision log says Supabase is approved and task records claim backend integration is complete.

**Impact:** Agents can make inconsistent assumptions and regress completed decisions.

**Required fix:** Reconcile `AGENTS.md`, root prompt, BIBLE, SRS, decision register, docs index and task queue to one source of truth.

### OPS-10 — Documentation claims are inconsistent with current implementation
**Evidence:** `backend/docs/12-capacity-and-load-report.md`, `13-backup-restore-drill.md`, `14-release-readiness-review.md`, `15-staging-deployment-runbook.md`, `16-monitoring-and-incident-runbook.md`, `backend/AGENT_TASK_QUEUE.md`.

The queue marks T-019 through T-030 DONE, but several acceptance statements (real private Storage, server-side sharing, persistent/atomic import, live RLS, actual 100k database load, actual restore) are not supported by source or CI.

**Impact:** Status reporting is not a reliable measure of production readiness.

**Required fix:** Reclassify each acceptance item as code implemented, unit tested, local integration tested, staging verified or production verified. Do not use DONE for a live gate until the corresponding evidence exists.

### OPS-11 — No browser end-to-end workflow suite
**Evidence:** `frontend/package.json`, `.github/workflows/ci.yml`.

The test command runs TypeScript unit/domain tests. No Playwright/Cypress/browser automation suite is configured.

**Impact:** Real journeys such as login, magic-link callback, customer intake, Nadeem review, sharing, correction, consent withdrawal, partner agreement and finance reversal are not tested in a browser.

**Required fix:** Add end-to-end browser tests against an isolated staging/Supabase local environment.

### OPS-12 — Android/RTL/accessibility tests are helper-level tests only
**Evidence:** `frontend/src/lib/accessibility.ts`, `frontend/src/lib/accessibility.test.ts`, `backend/docs/17-design-theme-review.md`.

The current automated tests verify formatting/contrast/touch-target helpers, not actual Android devices, screen readers, browser layout, Urdu RTL navigation or real responsive flows.

**Impact:** Device/locale accessibility claims remain unverified.

**Required fix:** Add real device/browser matrix testing and record evidence for supported Android browsers, Urdu RTL and English LTR.

---

# 6. Additional architecture and product gaps

### P2-01 — No first-party Edge Function/API implementation was found
The project decision log adopts Supabase Edge Functions, but the Git tree contains no `supabase/functions/` implementation or other trusted backend API handlers. Most operations are direct browser-to-Supabase calls.

**Required fix:** Add trusted endpoints for operations requiring transactions, server-derived identity, secret access, Storage signing, disclosure, migration, consent revocation, audit and finance posting. If direct PostgREST is retained for simple CRUD, keep RLS comprehensive and tested.

### P2-02 — Regional land conventions are not passed into all calculations
**Evidence:** `frontend/src/utils/units.ts`; `frontend/src/features/matchmaker/ProfileWizard.tsx`; `frontend/src/lib/profiles.ts`.

The converter defaults to 20 Marla/Kanal and 225 sq ft/Marla. The wizard calls it without loading saved regional settings, and profile enrichment also calls it with defaults.

**Required fix:** Load approved regional settings and pass them through every conversion/display path. Define the region for each profile/property rather than silently applying one global convention.

### P2-03 — Contact form and operational contact details need final wiring
The public pages include form-like contact UI and placeholder examples; the official office number is not configured. Verify every visible submit/call/WhatsApp control has a real, authorized action or is clearly marked unavailable.

### P2-04 — Unused/legacy application artifacts create ambiguity
The repository includes `frontend/src/App.original.tsx`, root `index.html`, graph outputs and older documentation. Verify deployment root points to `frontend/`, exclude generated artifacts from release builds where possible, and clearly mark legacy files so agents do not treat them as active code.

### P2-05 — No automated retention/purge scheduler is present
The code contains retention evaluators but no verified scheduled job to archive inactive profiles, purge expired photos, revoke grants or enforce retention windows.

**Required fix:** Implement scheduled backend jobs with dry-run, audit, idempotency, retention/legal hold rules and operational alerts.

### P2-06 — No reminder delivery integration is present
CRM records can be created/updated, but no durable scheduler/notification provider is implemented for follow-up reminders. Define whether reminders are in-app only, email, WhatsApp or another approved channel.

### P2-07 — Staff MFA and recovery policy remains unresolved
The auth flow implements password and magic-link login but the repository decisions/owner guide still leave staff MFA/recovery as an owner decision. Decide and enforce MFA before production.

### P2-08 — AI remains intentionally outside the core matching path
The decision log leaves AI processing (provider, data sent, notice, retention) open and specifies deterministic matching without paid AI. Do not advertise AI-assisted matching as a live feature until that decision, consent and implementation are completed. Human approval must remain mandatory.

---

# 7. Owner actions that code agents cannot safely do alone

1. Create/confirm separate development, staging and production Supabase projects and approved regions/plans.
2. Supply the public project URL and publishable/anon key through local environment files or hosting configuration. These are public client values, but still configure them only in the intended environment.
3. Store service-role keys, database passwords and any provider secrets only in trusted secret storage (Supabase/hosting/CI secret manager). Never paste privileged secrets into chat or commit them.
4. Configure Auth email/SMTP, redirect URLs, allowed origins, recovery flow and initial staff/admin accounts.
5. Approve staff MFA/recovery policy and exact customer-account/profile ownership process.
6. Provide the verified official bureau phone/WhatsApp number and approve any external message provider.
7. Have the owner/accountant approve partner agreement templates, settlement/ledger semantics and any required accounting export.
8. Approve actual customer data migration, consent evidence rules, retention/legal policy and production deployment.
9. Perform/authorize production billing plan changes and final launch acceptance.

The agent can implement code, migrations, tests and configuration templates. It cannot create/verify your private provider accounts or approve legal, consent, finance, billing and production actions on your behalf.

---

# 8. Required remediation sequence

Add these tasks after T-030. Execute one task per Antigravity run and preserve the direct-to-main rule.

| Task | Priority | Scope | Depends on |
|---|---|---|---|
| T-031 | P0 | Real migration runner, migration history/checksum, local PostgreSQL integration and staging migration verification | — |
| T-032 | P0 | Auth account status, customer/profile ownership, consent schema, audit integrity, database-enforced lifecycle/RLS | T-031 |
| T-033 | P0 | Profile repository UUID mapping, complete nested DTO mapping, transactional create/update, customer self-service and assisted ownership | T-032 |
| T-034 | P0 | Real private Storage, Storage RLS, consent withdrawal, server-side share issue/redeem/revoke and privacy erasure | T-032, T-033 |
| T-035 | P0 | Match UUID mapping, canonical pair uniqueness, persisted current evaluation, Nadeem-only decision and atomic approval/share preconditions | T-032, T-033, T-034 |
| T-036 | P1 | Customer portal recommendations, preference save, correction/deactivation requests, durable CRM links and reminder model | T-033, T-034, T-035 |
| T-037 | P1 | Matchmaker UUID/code correction, referral attribution, tiered agreement schema, finance settlement/reversal integrity and accounting tests | T-031, T-032 |
| T-038 | P0 | Durable migration batches, explicit consent review, no fabricated fields, real file hashing, atomic/resumable import, true merge and rollback | T-031, T-032, T-033, T-034 |
| T-039 | P1 | Server pagination, indexed search, bounded payloads, actual PostgreSQL 100k benchmark and concurrency testing | T-031, T-033, T-035, T-037 |
| T-040 | P0 | Real RLS/Storage/Auth integration suite, browser E2E, real backup/restore, monitoring, Android/RTL matrix, documentation reconciliation and final release evidence | T-031 through T-039 |

## 9. Final acceptance rule

Do not mark Gulistan Marriage Bureau “100% complete” because the TypeScript build passes or because a synthetic test passes.

The product may be considered ready for a controlled pilot only when:
- All P0 and P1 findings are fixed or explicitly accepted as non-applicable by the owner.
- Every SQL migration is applied to a clean local/staging database and verified.
- Auth, role provisioning, suspended-account rejection and all RLS boundaries pass real tests.
- Assisted and self-service profile creation, customer ownership, corrections and preferences work against staging.
- Photo upload, private read, signed link expiry, revocation and consent withdrawal work against actual Storage.
- Match approval, customer recommendation visibility and sharing require persisted Nadeem authorization and consent.
- CRM, partner agreements, finance, reversals and migration batches survive refresh/restart and pass transactional integrity tests.
- Real 100k PostgreSQL performance and restore drills are evidenced.
- Browser E2E, Android, Urdu RTL, English LTR and accessibility checks pass.
- Runbooks and release documents match the deployed schema and actual operations.
- The owner signs the final release acceptance.

**Current conclusion: the application is not yet production-ready. The first task should be T-031 because all subsequent “live persistence” claims depend on a real, verifiable database migration path.**
