# Graph Report - gulistan-marriage-bureau  (2026-11-20)

## Corpus Check
- 146 files · ~162,025 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 5, .example 1, .css 1)

## Summary
- 1467 nodes · 3067 edges · 89 communities (83 shown, 6 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 232 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3584770f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App.tsx
- DEPLOYMENT AND DATABASE
- Database Schema & Migrations
- auth.ts
- Backend Tests & QA Verification
- 5. P1 test, scale and operational evidence gaps
- disclosure.ts
- ref_node_assert
- lib/finance.ts
- useFinance.ts
- Backend Tests & QA Verification
- MockStorage
- Frontend Components & UI Layout
- Infrastructure & Operations
- Infrastructure & Operations
- Architecture & Specifications
- Frontend Components & UI Layout
- 2.3 Workstreams and order
- Subsystem Community 18
- Authentication & Access Control
- deploy-migrations.js
- Architecture & Specifications
- Database Schema & Migrations
- Frontend Components & UI Layout
- Subsystem Community 24
- Architecture & Specifications
- canAccessRole
- Architecture & Specifications
- Backend Tests & QA Verification
- Architecture & Specifications
- Tasks
- Database Schema & Migrations
- FollowUpItem
- Architecture & Specifications
- .create
- Architecture & Specifications
- Architecture & Specifications
- supabaseClient.ts
- profiles.ts
- Architecture & Specifications
- capacity-benchmark.js
- Architecture & Specifications
- Architecture & Specifications
- Frontend Components & UI Layout
- Subsystem Community 45
- profiles.test.ts
- Architecture & Specifications
- Architecture & Specifications
- Architecture & Specifications
- Database Schema & Migrations
- Frontend Components & UI Layout
- package.json
- PROFILE DATA AND REPOSITORY MAPPING
- Architecture & Specifications
- Database Schema & Migrations
- 3. Authorization, Privacy and Threat Model
- photos.ts
- Database Schema & Migrations
- controlled_disclosure.test.js
- Architecture & Specifications
- Backend Tests & QA Verification
- computeSha256
- 3. Detailed Domain Model Inventory
- 4. Confirmed P1 functional and data-integrity issues
- 1.2 Findings register
- canTransitionStatus
- 6. Additional architecture and product gaps
- Architecture & Specifications
- Frontend Components & UI Layout
- MockStorage
- 6. Frontend Integration Guide
- repositories.ts
- 2. Implementation and Refactoring Blueprint
- migration.ts
- AuthSession
- AuthSession
- steps
- 17. Design Theme Review & Visual Invariants
- 05-INDEPENDENT-REPOSITORY-AUDIT-2026-11-15.md
- AUTHENTICATION AND CONFIGURATION
- security_role_matrix.test.js
- validateProfileInput
- accessibility.ts
- AI Agent Task Queue — Gulistan Marriage Bureau
- MATCHING AND DISCLOSURE
- 1. Comprehensive Repository Audit
- followups_crm.test.js

## God Nodes (most connected - your core abstractions)
1. `AuthSession` - 90 edges
2. `ProfileRecord` - 51 edges
3. `canAccessRole()` - 45 edges
4. `getClientConfig()` - 44 edges
5. `Tasks` - 41 edges
6. `getSupabaseClient()` - 39 edges
7. `2026-11-14` - 37 edges
8. `App()` - 34 edges
9. `Language` - 33 edges
10. `react` - 27 edges

## Surprising Connections (you probably didn't know these)
- `T-006 — Authentication and session integration` --references--> `canAccessRole()`  [INFERRED]
  backend/AGENT_TASK_QUEUE.md → frontend/src/lib/auth.ts
- `P1-01 — Auth state callback performs awaited Supabase calls` --references--> `initAuth()`  [INFERRED]
  backend/docs/refactor/05-INDEPENDENT-REPOSITORY-AUDIT-2026-11-15.md → frontend/src/lib/auth.ts
- `4. Security Posture & Threat Model Verification` --references--> `validateShareGrant()`  [INFERRED]
  backend/docs/14-release-readiness-review.md → frontend/src/lib/disclosure.ts
- `P0-10 — Share operation does not enforce the persisted match approval` --references--> `verifyPreShareEligibility()`  [INFERRED]
  backend/docs/refactor/05-INDEPENDENT-REPOSITORY-AUDIT-2026-11-15.md → frontend/src/lib/matching.ts
- `P1-24 — Match decision state is not restored into evaluation DTO` --references--> `verifyPreShareEligibility()`  [INFERRED]
  backend/docs/refactor/05-INDEPENDENT-REPOSITORY-AUDIT-2026-11-15.md → frontend/src/lib/matching.ts

## Import Cycles
- None detected.

## Communities (89 total, 6 thin omitted)

### Community 0 - "App.tsx"
Cohesion: 0.06
Nodes (94): T-018 — Permanent language persistence across browser, cold load, and all stakeholder profiles, T-027 — Frontend application and feature-boundary refactor, 6.6 Existing domain mismatches to address deliberately, 3.8 Collaborative Financial Ledger (`FinancialTransaction`, `ExternalMatchmaker`), Transaction Types & Sign Semantics, App(), App(), AuthModal() (+86 more)

### Community 1 - "DEPLOYMENT AND DATABASE"
Cohesion: 0.17
Nodes (12): DEPLOYMENT AND DATABASE, P0-01 — Live migration runner is a false-success implementation, P0-02 — No PostgreSQL driver or executable migration service is present, P0-06 — Match-case creation sends human reference codes to UUID columns, P0-08 — Controlled disclosure grants are not persisted or redeemable, P0-09 — Sharing modal can fabricate a Nadeem session and has an authorization fallback, P0-10 — Share operation does not enforce the persisted match approval, P0-11 — Customer correction request path cannot pass real authorization (+4 more)

### Community 2 - "Database Schema & Migrations"
Cohesion: 0.05
Nodes (64): idx_audit_events_created_at, idx_audit_events_target, idx_candidate_consents_profile_id, idx_profiles_caste, idx_profiles_created_at, idx_profiles_created_by, idx_profiles_current_city, idx_profiles_gender (+56 more)

### Community 3 - "auth.ts"
Cohesion: 0.06
Nodes (51): T-019 — Module 01 / Workstream W0: Supabase Auth integration, trusted role mapping & C-01 completion, T-032 — Auth account status, customer/profile ownership, consent schema, audit integrity, database-enforced lifecycle/RLS, 3.9 Client session and access control integration (T-006), P0-16 — Suspended/pending user account status is not enforced during authentication, AuthResult, AuthUser, buildSessionFromProvider(), currentSession (+43 more)

### Community 4 - "Backend Tests & QA Verification"
Cohesion: 0.08
Nodes (28): T-009 — Preferences and deterministic matching, 5.10 Implemented Deterministic Matching Specification (T-009), 5.1 Purpose and non-goals, 5.2 Matching pipeline, 5.3 Existing frontend logic is not authoritative, 5.4 Required evaluation record, 5.5 Fairness and sensitive criteria, 5.6 Controlled WhatsApp message (+20 more)

### Community 5 - "5. P1 test, scale and operational evidence gaps"
Cohesion: 0.17
Nodes (12): 5. P1 test, scale and operational evidence gaps, OPS-01 — CI does not test against a real PostgreSQL/Supabase database, OPS-02 — Security role-matrix tests use local fake functions, OPS-04 — Current CI smoke test is explicitly simulation-only, OPS-05 — 100k capacity benchmark is in-memory JavaScript, not PostgreSQL, OPS-06 — Backup/restore drill is an in-memory simulation, OPS-07 — Release-readiness document overstates approval, OPS-08 — Incident runbook SQL does not match the schema (+4 more)

### Community 6 - "disclosure.ts"
Cohesion: 0.11
Nodes (23): T-010 — Controlled disclosure and WhatsApp draft generation, 5.11 Implemented Controlled Disclosure & WhatsApp Proposal Engine (T-010), activeShareGrantsByHash, activeShareGrantsByToken, AuthorizedDisclosedData, AuthorizedDisclosureSnapshot, authorizeDisclosure(), BUREAU_OFFICE_PHONE (+15 more)

### Community 7 - "ref_node_assert"
Cohesion: 0.09
Nodes (23): REPO_ROOT, __dirname, __filename, MATCHING_CODE_PATH, OPEN_DECISIONS_PATH, __dirname, __filename, MIGRATION_PATH (+15 more)

### Community 8 - "lib/finance.ts"
Cohesion: 0.05
Nodes (49): T-012 — Auditable financial ledger, T-026 — Financial ledger correctness and persistence, 4.1 API approach, 4.3 Profile update and duplicate review, 4.4 Search, 4.5 Match review, 4.6 Controlled sharing, 4.7 Financial workflows (T-012 — Auditable Financial Ledger) (+41 more)

### Community 9 - "useFinance.ts"
Cohesion: 0.16
Nodes (7): UseFinanceResult, BureauReconciliationSummary, PartnerLedgerSummary, financeRepository, FinanceRepositoryImpl, IFinanceRepository, resetFinanceRepositoryForTesting()

### Community 10 - "Backend Tests & QA Verification"
Cohesion: 0.13
Nodes (29): T-011 — Follow-ups and external matchmaker attribution, T-025 — External matchmaker agreements, CRM and follow-ups, 4.8 Follow-ups and External Matchmaker Attribution (T-011), attributeProfileToMatchmaker(), auditEventsStore, canAccessCRM(), completeFollowUp(), computeFollowUpStatus() (+21 more)

### Community 12 - "Frontend Components & UI Layout"
Cohesion: 0.13
Nodes (21): devDependencies, autoprefixer@^10.4.21, tailwindcss@^4.3.3, tsx@^4.21.0, @types/express@^4.17.21, @types/node@^22.14.0, @types/react@^19.3.0, @types/react-dom@^19.3.0 (+13 more)

### Community 13 - "Infrastructure & Operations"
Cohesion: 0.10
Nodes (20): POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, interval, retries, test, timeout, container_name (+12 more)

### Community 14 - "Infrastructure & Operations"
Cohesion: 0.10
Nodes (18): 1. When to Use Docker, 2. Usage Instructions, Check Database Health, Connect Locally, Optional Local Docker Setup, Start Local PostgreSQL, Stop and Clean Up, 1. Quick Start & Setup Commands (+10 more)

### Community 15 - "Architecture & Specifications"
Cohesion: 0.11
Nodes (18): 11. Minimum Owner Decision Sheet, Context, Context, Context, Decision 1: Authentication Method for Candidates & Staff, Decision 2: Staff Operational Scope & Access Hierarchy, Decision 3: Public Candidate Registration & Intake Model, Decision 4: Candidate Consent & Guardian Authority (+10 more)

### Community 16 - "Frontend Components & UI Layout"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+9 more)

### Community 17 - "2.3 Workstreams and order"
Cohesion: 0.18
Nodes (11): 2.3 Workstreams and order, W0 — Repository baseline and authentication reconciliation (P0), W1 — Configuration and runtime boundaries (P0), W2 — Schema, migrations and repositories (P0), W3 — Profile intake and data integrity (P0/P1), W4 — Consent, photos, privacy and sharing (P0), W5 — Matching and Nadeem review (P0/P1), W6 — Matchmakers, CRM and finance (P1) (+3 more)

### Community 18 - "Subsystem Community 18"
Cohesion: 0.10
Nodes (20): dependencies, pg@^8.23.1, description, engines, node, keywords, name, private (+12 more)

### Community 19 - "Authentication & Access Control"
Cohesion: 0.12
Nodes (16): 2026-11-07 — Initial remediation session, 2026-11-13 — Module 01 Supabase Auth integration, trusted role mapping & C-01 verification, 2026-11-13 — Product Owner workflow decision and direct-main transfer, Actual Validation Results, Changes committed, Commit checkpoints, Direct-main transfer, Module 01 — Work Log (+8 more)

### Community 20 - "deploy-migrations.js"
Cohesion: 0.25
Nodes (16): T-031 — Real migration runner, migration history/checksum, local PostgreSQL integration and staging migration verification, applySingleMigration(), calculateMigrationChecksum(), DEFAULT_MIGRATIONS_TABLE, ensureMigrationTable(), getAppliedMigrations(), getMigrationPlan(), maskDatabaseUrl() (+8 more)

### Community 21 - "Architecture & Specifications"
Cohesion: 0.12
Nodes (15): 3.1 Evidence levels, 3.2 P0 gates, 3.3 P1 functional gates, 3.4 P2 quality and operations, 3.5 Definition of DONE per task, 3.6 Final release decision, 3. Acceptance, Test and Release Gates, GATE A — Identity and authorization (+7 more)

### Community 22 - "Database Schema & Migrations"
Cohesion: 0.22
Nodes (9): getMigrationStatus(), __dirname, __filename, MIGRATIONS_DIR, runCli(), validateMigrationFiles(), BACKEND_DIR, __dirname (+1 more)

### Community 23 - "Frontend Components & UI Layout"
Cohesion: 0.13
Nodes (15): dependencies, dotenv@^17.2.3, express@^4.21.2, @google/genai@^2.4.0, lucide-react@^0.546.0, motion@^12.23.24, react@^19.0.1, react-dom@^19.0.1 (+7 more)

### Community 24 - "Subsystem Community 24"
Cohesion: 0.13
Nodes (14): 1. Lead Matchmaker Operational Desk (Nadeem Desk), 2. 7-Step Guided Profile Wizard, 3. Customer & Candidate Portal, 4. Administrator Governance & Security, 5. Full Bilingual Localization (English & اردو), 🏛️ Architectural Heritage & Design Philosophy, 🚀 Getting Started, Gulistan Marriage Bureau • گلستان میرج بیورو (+6 more)

### Community 25 - "Architecture & Specifications"
Cohesion: 0.14
Nodes (13): A. Mandatory reading — before editing anything, Antigravity Master Implementation Prompt — Gulistan Marriage Bureau, B. Approved architecture decision, C. Direct-main Git workflow, Copy/paste instruction, D. Work package 1 — C-01 demo-authentication removal, E. Work package 2 — Supabase Auth integration, F. Environment and secrets (+5 more)

### Community 26 - "canAccessRole"
Cohesion: 0.26
Nodes (8): UseMatchmakersResult, canAccessRole(), createProfile(), matchmakerRepository, MatchmakerRepositoryImpl, resetMatchmakerRepositoryForTesting(), DetailedExternalMatchmaker, PartnerAgreement

### Community 27 - "Architecture & Specifications"
Cohesion: 0.15
Nodes (12): 2.1 Design rules, 2.2 Proposed entities, 2.3 Profile field mapping from the current UI, 2.4 Enums and controlled values, 2.5 Data integrity and indexing, 2.6 Seed data and migrations, 2. Backend Data Model, External matchmakers and finance (+4 more)

### Community 28 - "Backend Tests & QA Verification"
Cohesion: 0.15
Nodes (13): 7.1 Required quality gates, 7.2 Test layers, 7.3 Migrations, 7.4 Environments and secrets, 7.5 Backup and recovery, 7.6 Release process, 7.7 Monitoring and incidents, 7. Testing, Release and Operations (+5 more)

### Community 29 - "Architecture & Specifications"
Cohesion: 0.15
Nodes (13): 15. Staging & Production Deployment Runbook, 1. Overview & Pre-requisites, 2. Step-by-Step Provisioning Guide, 3. Applying Migrations to Live Database, 4. Smoke-Testing the Live Environment, 5. Frontend Production Release, 6. Post-Deployment Verification Checklist, Build and Deploy Command (+5 more)

### Community 30 - "Tasks"
Cohesion: 0.11
Nodes (18): T-001 — Inventory frontend domain contracts for backend mapping, T-002 — Prepare minimum owner decision sheet, T-003 — Establish backend tooling without production connections, T-004 — First approved database migration and access-control baseline, T-005 — Typed backend client/configuration boundary, T-006 — Authentication and session integration, T-013 — Security, scale, backup and release review, T-014 — Staging deployment automation, live Supabase migration script, and production smoke-test harness (+10 more)

### Community 32 - "Database Schema & Migrations"
Cohesion: 0.38
Nodes (8): OPS-03 — Live smoke test can report false security success, __dirname, __filename, MIGRATIONS_DIR, runSmokeTests(), validateEnvironmentSanity(), validateSecurityBaseline(), validateStorageSecurity()

### Community 33 - "FollowUpItem"
Cohesion: 0.14
Nodes (13): CRM AND EXTERNAL MATCHMAKERS, P1-30 — CRM profile linkage is not persisted, P1-31 — CRM fallback values fabricate contact identity, P1-32 — Matchmaker code is used where database UUID is required, P1-33 — Tiered partner commission model is not represented in the SQL agreement table, P1-34 — Referral attribution only increments a counter, UseCRMResult, DetailedFollowUpItem (+5 more)

### Community 34 - "Architecture & Specifications"
Cohesion: 0.18
Nodes (10): 1. Mandatory startup reading, 2. Product invariants, 3. Security and privacy, 4. Repository workflow, 5. Select exactly one task, 6. Before coding, 7. Implement and verify, 8. Update documentation and queue (+2 more)

### Community 35 - ".create"
Cohesion: 0.16
Nodes (13): T-021 — Database schema completion and typed persistence repositories, T-022 — Profile intake, lifecycle, consent integrity and self-service, P0-03 — Self-service profile creation is rejected by the database, P0-04 — Consent schema contradicts the profile write path and defaults, P1-13 — Profile create is not transactional, P1-14 — Generated profile reference codes can collide, 2026-11-13, Project Changelog (+5 more)

### Community 36 - "Architecture & Specifications"
Cohesion: 0.22
Nodes (9): 1.1 Product context, 1.2 Current frontend — preserve it, 1.3 Backend baseline, 1.4 Trust boundaries, 1.5 Proposed logical architecture, 1.6 Architecture principles, 1.7 Environments and configuration, 1.8 Docker decision (+1 more)

### Community 37 - "Architecture & Specifications"
Cohesion: 0.20
Nodes (9): 1. Authority and ownership, 2. Truthfulness and customer data, 3. Privacy and security, 4. Business authority and AI, 5. Engineering boundaries, 6. Mandatory task workflow, 7. Status vocabulary, 8. Module completion rule (+1 more)

### Community 38 - "supabaseClient.ts"
Cohesion: 0.25
Nodes (11): T-020 — Refactor Workstream W1: Configuration schema, production demo-mode rejection & distinct service health, P1-02 — Staging can silently fall back to demo mode, BackendHealthStatus, ClientConfig, ConfigValidationResult, getBackendHealthStatus(), resetClientConfigForTesting(), ServiceComponentHealth (+3 more)

### Community 39 - "profiles.ts"
Cohesion: 0.15
Nodes (17): T-033 — Profile repository UUID mapping, complete nested DTO mapping, transactional create/update, customer self-service and assisted ownership, Fields & Types, demoProfiles, generateReferenceCode(), PERMITTED_STATUS_TRANSITIONS, ProfileSummaryDTO, ProfileValidationResult, ValidationError (+9 more)

### Community 40 - "Architecture & Specifications"
Cohesion: 0.22
Nodes (8): 8.1 Mandatory first steps, 8.2 Preserve existing work, 8.3 Security rules, 8.4 Database and migration rules, 8.5 Coding standards, 8.6 Required completion report, 8.7 Definition of done, 8. AI Agent Operating Contract

### Community 41 - "capacity-benchmark.js"
Cohesion: 0.16
Nodes (19): T-029 — Real integration tests, security tests, CI and capacity, AQEEDAHS, benchmarkConcurrency(), benchmarkDeterministicMatching(), benchmarkFilterQuery(), calculatePercentiles(), CASTES, CITIES (+11 more)

### Community 42 - "Architecture & Specifications"
Cohesion: 0.22
Nodes (8): 12. Capacity, Scale and Load Test Report, 1. Executive Summary, 2. Test Environment & Configuration, 3.1 Profile Generation & Memory Footprint, 3.2 Filter Query Performance (Simulated Index Scan), 3.3 Deterministic Matching Engine Throughput, 3. Actual Measured Benchmark Results, 4. Cloud Provider Sizing & Tier Recommendations

### Community 43 - "Architecture & Specifications"
Cohesion: 0.25
Nodes (7): 4.1 Owner-only actions, 4.2 Environment variables, 4.3 Owner local setup checklist, 4.4 Secret handling, 4.5 Owner decisions still needed, 4.6 First owner action, 4. Owner Actions and Environment Setup

### Community 44 - "Frontend Components & UI Layout"
Cohesion: 0.25
Nodes (6): @tailwindcss/vite@^4.3.3, vite@^8.3.0, @vitejs/plugin-react@^6.1.1, @tailwindcss/vite, vite, @vitejs/plugin-react

### Community 45 - "Subsystem Community 45"
Cohesion: 0.25
Nodes (5): fs, http, MIME_TYPES, path, server

### Community 46 - "profiles.test.ts"
Cohesion: 0.22
Nodes (12): formatInchesToHeight(), ProfilePreferencesRow, profilePreferencesRowToDTO(), ProfilePropertyRow, profilePropertyRowToDTO(), profileRowToDTO(), ProfileSiblingRow, profileSiblingRowToDTO() (+4 more)

### Community 47 - "Architecture & Specifications"
Cohesion: 0.29
Nodes (6): Decisions and privacy, Documentation and reporting, Instructions for AI Coding Agents, Project architecture, Repository rules, Start every run

### Community 48 - "Architecture & Specifications"
Cohesion: 0.25
Nodes (7): 13. Backup, Disaster Recovery and Media Restore Drill, 1. Scope & Objective, 2. Test Execution & Results, 3.1 Recovery Point Objective (RPO), 3.2 Recovery Time Objective (RTO), 3. Disaster Recovery Objectives, 4. Consent Withdrawal and Backup Interaction (OPEN-008 & OPEN-016)

### Community 49 - "Architecture & Specifications"
Cohesion: 0.29
Nodes (7): Agent entry point — read this first, Authority and conflict resolution, Core rule, Current verified repository state, Gulistan Marriage Bureau — Documentation Bible, Read the specifications in this order, Refactoring programme (2026-11-13)

### Community 50 - "Database Schema & Migrations"
Cohesion: 0.20
Nodes (9): `00001_initial_schema_baseline.sql`, `00005_auth_lifecycle_ownership_and_audit.sql`, `00006_profile_intake_and_ownership_enhancements.sql`, 1. File Naming Convention, 2. Mandatory Migration Safety Invariants, 3. Migration Tooling & Deployment Runner, 4. Migration Catalog & Recovery Limits, Database Migrations — Gulistan Marriage Bureau (+1 more)

### Community 51 - "Frontend Components & UI Layout"
Cohesion: 0.29
Nodes (7): scripts, build, clean, dev, lint, preview, test

### Community 52 - "package.json"
Cohesion: 0.67
Nodes (3): devDependencies, supabase@^3.1.0, supabase

### Community 53 - "PROFILE DATA AND REPOSITORY MAPPING"
Cohesion: 0.18
Nodes (11): P1-08 — Profile wizard still manufactures candidate facts, P1-09 — DTO fallback still fabricates a property object, P1-10 — Nested database DTOs are not mapped from snake_case to camelCase, P1-11 — Preferences persistence is incomplete and has a type mismatch, P1-12 — Sibling and property persistence is lossy, P1-15 — Customer portal selects the first profile rather than resolving ownership, P1-16 — Backend customer recommendations are always empty, P1-17 — Preference editor reports success without saving (+3 more)

### Community 54 - "Architecture & Specifications"
Cohesion: 0.33
Nodes (5): Completion meaning, Governing sources, Gulistan Marriage Bureau — Refactoring Programme, Non-negotiable invariants, Start here

### Community 55 - "Database Schema & Migrations"
Cohesion: 0.60
Nodes (5): idx_financial_tx_created_at, idx_financial_tx_matchmaker, idx_financial_tx_status, idx_financial_tx_type, public.financial_transactions

### Community 56 - "3. Authorization, Privacy and Threat Model"
Cohesion: 0.22
Nodes (9): 3.1 Security posture, 3.2 Role model, 3.3 Authorization matrix (minimum baseline), 3.4 Supabase implementation rules, 3.5 Consent and privacy, 3.6 Photos and files, 3.7 Audit and logging, 3.8 Threats to test (+1 more)

### Community 57 - "photos.ts"
Cohesion: 0.11
Nodes (26): T-008 — Private photos and consent-gated access, T-023 — Private photos, consent events, protected grants and disclosure, 3.10 Private photo storage and consent-gated access (T-008), P0-07 — Photo upload, signed grants and deletion are in-memory only, P1-28 — Privacy erasure only touches the demo photo map, activeGrantsByHash, activeGrantsByToken, ALLOWED_MIME_TYPES (+18 more)

### Community 58 - "Database Schema & Migrations"
Cohesion: 0.33
Nodes (5): __dirname, __filename, FINANCE_CODE_PATH, MIGRATION_00002_PATH, OPEN_DECISIONS_PATH

### Community 59 - "controlled_disclosure.test.js"
Cohesion: 0.33
Nodes (5): __dirname, DISCLOSURE_CODE_PATH, __filename, MIGRATION_PATH, OPEN_DECISIONS_PATH

### Community 60 - "Architecture & Specifications"
Cohesion: 0.40
Nodes (5): 9.1 Initial decision log, 9.2 Safe defaults while decisions are open, 9.3 How to close an open decision, 9.4 Decisions Closed on 2026-10-24, 9. Open Decisions and Decision Log

### Community 61 - "Backend Tests & QA Verification"
Cohesion: 0.40
Nodes (4): 2026-11-13 — Execution Run Evidence, Acceptance, Evidence log, Module 01 — Test Results

### Community 62 - "computeSha256"
Cohesion: 0.20
Nodes (9): computeSha256(), generateSecureToken(), revokeShareGrant(), generateSignedPhotoGrant(), revokeSignedPhotoGrant(), validateSignedPhotoAccess(), resetSupabaseClientForTesting(), setSupabaseClientForTesting() (+1 more)

### Community 63 - "3. Detailed Domain Model Inventory"
Cohesion: 0.07
Nodes (29): 10. Frontend Domain Inventory for Backend Mapping, 1. Executive Summary & Purpose, 2. Frontend Tooling & Runtime Environment Baseline, 3.1 Candidate Profile Entity (`ProfileRecord`), 3.2 Sibling Repeating Structure (`SiblingRecord`), 3.3 Property Details & Pakistani Land Measurement (`PropertyDetails`), 3.4 Partner Preferences & Multi-Tier Criteria Classification (`PartnerPreference`), 3.5 Match Recommendation & Review Lifecycle (`MatchRecommendation`) (+21 more)

### Community 64 - "4. Confirmed P1 functional and data-integrity issues"
Cohesion: 0.20
Nodes (10): 4. Confirmed P1 functional and data-integrity issues, FINANCE, P1-25 — No Storage object policies are defined in the migrations, P1-26 — Photo display maps a storage path to an image URL, P1-27 — Share grant schema does not store the claimed fixed snapshot/match binding, P1-29 — Bureau office contact is an explicit placeholder, P1-36 — Duplicate reversal is not prevented atomically, P1-37 — Paid/received transaction types default to pending in the repository (+2 more)

### Community 65 - "1.2 Findings register"
Cohesion: 0.20
Nodes (10): 1.2 Findings register, A. Authentication, identity and authorization, B. Configuration and demo isolation, C. Persistence and data model, D. Profile intake and migration, E. Consent, photos, privacy and sharing, F. Matching and AI, G. Sharing and WhatsApp (+2 more)

### Community 66 - "canTransitionStatus"
Cohesion: 0.20
Nodes (12): T-007 — Profile create/read/update and review lifecycle, 4.2 Profile registration and review, Customer registration, DTO and Database Row Separation (T-007), Review transitions (Approved & Implemented in T-007), Staff-created profile, P0-05 — Profile lifecycle state machine is not enforced by the database, canTransitionStatus() (+4 more)

### Community 67 - "6. Additional architecture and product gaps"
Cohesion: 0.22
Nodes (9): 6. Additional architecture and product gaps, P2-01 — No first-party Edge Function/API implementation was found, P2-02 — Regional land conventions are not passed into all calculations, P2-03 — Contact form and operational contact details need final wiring, P2-04 — Unused/legacy application artifacts create ambiguity, P2-05 — No automated retention/purge scheduler is present, P2-06 — No reminder delivery integration is present, P2-07 — Staff MFA and recovery policy remains unresolved (+1 more)

### Community 71 - "6. Frontend Integration Guide"
Cohesion: 0.25
Nodes (7): 6.1 Goal, 6.2 Do not rewrite the app, 6.3 Introduce a typed data-access boundary, 6.4 Suggested migration sequence, 6.5 UI and state rules, 6.7 Demo data, 6. Frontend Integration Guide

### Community 72 - "repositories.ts"
Cohesion: 0.06
Nodes (30): UseProfilesResult, useSettings(), UseSettingsResult, AppSettings, AuditRepositoryImpl, demoAgreementsStore, demoAuditLogsStore, demoFollowUpsStore (+22 more)

### Community 73 - "2. Implementation and Refactoring Blueprint"
Cohesion: 0.25
Nodes (5): 2.1 Objective and target architecture, 2.2 Preserve source meaning, 2.4 File-level refactor map, 2.5 Dependency and stop rules, 2. Implementation and Refactoring Blueprint

### Community 74 - "migration.ts"
Cohesion: 0.08
Nodes (48): T-028 — Staged WhatsApp and phone-gallery migration, P1-39 — Staging engine does not use the new migration tables, P1-40 — Importer fabricates candidate facts, P1-41 — Import “merge_update” does not merge, P1-42 — Batch import is not atomic, P1-43 — Consent parser treats text mentions as consent proof, P1-44 — Gallery migration metadata is not a photo import, P1-45 — Reconciliation checksum check only checks string length (+40 more)

### Community 75 - "AuthSession"
Cohesion: 0.22
Nodes (4): getClientConfig(), MatchRepositoryImpl, ProfileRepositoryImpl, getSupabaseClient()

### Community 76 - "AuthSession"
Cohesion: 0.12
Nodes (7): T-024 — Deterministic matching, persisted evaluations and Nadeem approvals, AuthSession, MatchEvaluation, IAuditRepository, IMatchmakerRepository, IMatchRepository, IProfileRepository

### Community 77 - "steps"
Cohesion: 0.08
Nodes (23): concurrency, cancel-in-progress, group, jobs, quality-gate, name, on, pull_request (+15 more)

### Community 78 - "17. Design Theme Review & Visual Invariants"
Cohesion: 0.25
Nodes (8): 17. Design Theme Review & Visual Invariants, 1. Executive Summary & Review Invariant, 2. Design Theme Specifications, 3. Implementation Token Strategy (Zero-Disruption Migration), 4. Android-First & Accessibility Guarantees, Theme 1: Gulistan Heritage (Active Baseline), Theme 2: Modern Trust (Alternative Corporate Palette), Theme 3: Warm Elegance (Alternative Luxury Palette)

### Community 79 - "05-INDEPENDENT-REPOSITORY-AUDIT-2026-11-15.md"
Cohesion: 0.25
Nodes (7): 1. Executive verdict, 2. Scope and evidence limits, 3. Confirmed P0 release blockers, 7. Owner actions that code agents cannot safely do alone, 8. Required remediation sequence, 9. Final acceptance rule, Independent Repository Audit — 2026-11-15

### Community 80 - "AUTHENTICATION AND CONFIGURATION"
Cohesion: 0.29
Nodes (7): AUTHENTICATION AND CONFIGURATION, P1-01 — Auth state callback performs awaited Supabase calls, P1-03 — Unknown environment labels silently become development, P1-04 — Non-local HTTP Supabase URLs are accepted, P1-05 — Health status overstates actual service availability, P1-06 — CI secret scan is too narrow, P1-07 — Default Supabase auth persistence uses browser local storage

### Community 81 - "security_role_matrix.test.js"
Cohesion: 0.40
Nodes (3): adminSession, customerSession, nadeemSession

### Community 82 - "validateProfileInput"
Cohesion: 0.53
Nodes (6): T-015 — Sibling profiles and structured property holdings integration, Sibling and Property Validation (Approved & Implemented in T-015 / OPEN-011), enrichPropertyDetails(), validateProfileInput(), validatePropertyDetails(), validateSiblingRecord()

### Community 83 - "accessibility.ts"
Cohesion: 0.29
Nodes (12): T-030 — Backup, restore, monitoring, Android/RTL and final release, calculateContrastRatio(), formatBilingualCurrency(), formatBilingualDate(), formatBilingualPhone(), formatBilingualReferenceCode(), getRelativeLuminance(), LRI (+4 more)

### Community 84 - "AI Agent Task Queue — Gulistan Marriage Bureau"
Cohesion: 0.40
Nodes (4): AI Agent Task Queue — Gulistan Marriage Bureau, Execution protocol, Status meanings, Task history

### Community 85 - "MATCHING AND DISCLOSURE"
Cohesion: 0.33
Nodes (6): MATCHING AND DISCLOSURE, P1-20 — Approval can be recorded when no evaluation exists, P1-21 — Match approval and match-case status update are not atomic, P1-22 — Approval identity is not constrained to Nadeem at the database boundary, P1-23 — Match-case uniqueness does not prevent reversed duplicate pairs, P1-24 — Match decision state is not restored into evaluation DTO

### Community 86 - "1. Comprehensive Repository Audit"
Cohesion: 0.40
Nodes (5): 1.1 Executive status and authentication discrepancy, 1.3 Contradictions to reconcile, 1.4 Key files, 1.5 Limits, 1. Comprehensive Repository Audit

### Community 87 - "followups_crm.test.js"
Cohesion: 0.33
Nodes (5): __dirname, __filename, FOLLOWUPS_CODE_PATH, MIGRATION_PATH, OPEN_DECISIONS_PATH

## Knowledge Gaps
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Tasks` connect `Tasks` to `App.tsx`, `canTransitionStatus`, `auth.ts`, `Backend Tests & QA Verification`, `.create`, `disclosure.ts`, `supabaseClient.ts`, `lib/finance.ts`, `capacity-benchmark.js`, `Backend Tests & QA Verification`, `migration.ts`, `AuthSession`, `profiles.ts`, `validateProfileInput`, `accessibility.ts`, `AI Agent Task Queue — Gulistan Marriage Bureau`, `deploy-migrations.js`, `photos.ts`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `ProfileRecord` (e.g. with `T-007 — Profile create/read/update and review lifecycle` and `T-033 — Profile repository UUID mapping, complete nested DTO mapping, transactional create/update, customer self-service and assisted ownership`) actually correct?**
  _`ProfileRecord` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05765503875968992 - nodes in this community are weakly interconnected._
- **Why does `AuthSession` connect `AuthSession` to `App.tsx`, `FollowUpItem`, `auth.ts`, `Backend Tests & QA Verification`, `.create`, `disclosure.ts`, `profiles.ts`, `repositories.ts`, `useFinance.ts`, `lib/finance.ts`, `Backend Tests & QA Verification`, `migration.ts`, `AuthSession`, `profiles.test.ts`, `photos.ts`, `canAccessRole`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Should `Database Schema & Migrations` be split into smaller, more focused modules?**
  _Cohesion score 0.05370843989769821 - nodes in this community are weakly interconnected._
- **Why does `ProfileRecord` connect `App.tsx` to `canTransitionStatus`, `.create`, `Backend Tests & QA Verification`, `disclosure.ts`, `profiles.ts`, `repositories.ts`, `migration.ts`, `AuthSession`, `AuthSession`, `profiles.test.ts`, `Architecture & Specifications`, `3. Detailed Domain Model Inventory`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Should `auth.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05868118572292801 - nodes in this community are weakly interconnected._