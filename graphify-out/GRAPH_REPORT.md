# Graph Report - gulistan-marriage-bureau  (2026-11-20)

## Corpus Check
- 149 files · ~168,971 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 5, .example 1, .css 1)

## Summary
- 1522 nodes · 3234 edges · 102 communities (96 shown, 6 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 244 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3686086a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App.tsx
- DEPLOYMENT AND DATABASE
- 00003_complete_normalized_schema.sql
- auth.test.ts
- matching.test.ts
- 5. P1 test, scale and operational evidence gaps
- disclosure.ts
- ref_node_assert
- lib/finance.ts
- 2026-11-14
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
- public.share_grants
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
- repositories.test.ts
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
- public.profiles
- Architecture & Specifications
- Database Schema & Migrations
- 3. Authorization, Privacy and Threat Model
- photos.ts
- Database Schema & Migrations
- controlled_disclosure.test.js
- Architecture & Specifications
- Backend Tests & QA Verification
- auth.ts
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
- Module 01 — Authentication and Session Integrity
- accessibility.ts
- AI Agent Task Queue — Gulistan Marriage Bureau
- MATCHING AND DISCLOSURE
- 1. Comprehensive Repository Audit
- ref_node_url
- public.user_roles
- T-034 — Real private Storage, Storage RLS, consent withdrawal, server-side share issue/redeem/revoke and privacy erasure
- 00004_staged_migration_batches.sql
- 5. Matching Engine and Controlled Sharing
- AuthorizedDisclosureSnapshot
- Module 01 — Supabase Auth Integration Specification
- signInWithPassword
- 10. Frontend Domain Inventory for Backend Mapping
- matching.ts
- CRM AND EXTERNAL MATCHMAKERS
- PHOTOS, CONSENT AND SHARING
- recordMatchDecision
- public.profile_photos

## God Nodes (most connected - your core abstractions)
1. `AuthSession` - 98 edges
2. `getClientConfig()` - 54 edges
3. `ProfileRecord` - 51 edges
4. `canAccessRole()` - 47 edges
5. `getSupabaseClient()` - 46 edges
6. `Tasks` - 41 edges
7. `2026-11-14` - 37 edges
8. `Language` - 35 edges
9. `App()` - 30 edges
10. `react` - 28 edges

## Surprising Connections (you probably didn't know these)
- `T-006 — Authentication and session integration` --references--> `canAccessRole()`  [INFERRED]
  backend/AGENT_TASK_QUEUE.md → frontend/src/lib/auth.ts
- `2.3 Profile field mapping from the current UI` --references--> `ProfileRecord`  [INFERRED]
  backend/docs/02-data-model.md → frontend/src/types/index.ts
- `Land Unit Conversion Invariants & Regional Variations` --references--> `convertMarlaToKanal()`  [INFERRED]
  backend/docs/10-frontend-domain-inventory.md → frontend/src/utils/units.ts
- `P1-01 — Auth state callback performs awaited Supabase calls` --references--> `initAuth()`  [INFERRED]
  backend/docs/refactor/05-INDEPENDENT-REPOSITORY-AUDIT-2026-11-15.md → frontend/src/lib/auth.ts
- `8. Current implementation notes` --references--> `initAuth()`  [INFERRED]
  MODULES/MODULE-01-AUTHENTICATION/01-AUTHENTICATION-REMEDIATION.md → frontend/src/lib/auth.ts

## Import Cycles
- None detected.

## Communities (102 total, 6 thin omitted)

### Community 0 - "App.tsx"
Cohesion: 0.05
Nodes (89): T-018 — Permanent language persistence across browser, cold load, and all stakeholder profiles, App(), App(), Footer(), FooterProps, Navbar(), NavbarProps, ControlledSharingModal() (+81 more)

### Community 1 - "DEPLOYMENT AND DATABASE"
Cohesion: 0.18
Nodes (11): DEPLOYMENT AND DATABASE, P0-01 — Live migration runner is a false-success implementation, P0-02 — No PostgreSQL driver or executable migration service is present, P0-06 — Match-case creation sends human reference codes to UUID columns, P0-08 — Controlled disclosure grants are not persisted or redeemable, P0-09 — Sharing modal can fabricate a Nadeem session and has an authorization fallback, P0-11 — Customer correction request path cannot pass real authorization, P0-12 — Customer consent toggles are local UI state only (+3 more)

### Community 2 - "00003_complete_normalized_schema.sql"
Cohesion: 0.14
Nodes (23): idx_crm_follow_ups_assigned, idx_crm_follow_ups_profile, idx_crm_follow_ups_sched, idx_external_matchmakers_code, idx_external_matchmakers_status, idx_match_cases_profiles, idx_match_cases_status, idx_match_decisions_case (+15 more)

### Community 3 - "auth.test.ts"
Cohesion: 0.18
Nodes (14): T-019 — Module 01 / Workstream W0: Supabase Auth integration, trusted role mapping & C-01 completion, T-032 — Auth account status, customer/profile ownership, consent schema, audit integrity, database-enforced lifecycle/RLS, P0-16 — Suspended/pending user account status is not enforced during authentication, buildSessionFromProvider(), fetchUserAccountStatus(), fetchUserTrustedRole(), initAuth(), mapDatabaseRoleToAppRole() (+6 more)

### Community 4 - "matching.test.ts"
Cohesion: 0.20
Nodes (10): T-024 — Deterministic matching, persisted evaluations and Nadeem approvals, P0-10 — Share operation does not enforce the persisted match approval, evaluateCandidateMatch(), rankCandidatesForProfile(), candidateSession, sampleCompatibleBride, samplePrimaryGroom, staffSession (+2 more)

### Community 5 - "5. P1 test, scale and operational evidence gaps"
Cohesion: 0.17
Nodes (12): 5. P1 test, scale and operational evidence gaps, OPS-01 — CI does not test against a real PostgreSQL/Supabase database, OPS-02 — Security role-matrix tests use local fake functions, OPS-04 — Current CI smoke test is explicitly simulation-only, OPS-05 — 100k capacity benchmark is in-memory JavaScript, not PostgreSQL, OPS-06 — Backup/restore drill is an in-memory simulation, OPS-07 — Release-readiness document overstates approval, OPS-08 — Incident runbook SQL does not match the schema (+4 more)

### Community 6 - "disclosure.ts"
Cohesion: 0.06
Nodes (43): T-010 — Controlled disclosure and WhatsApp draft generation, 5.11 Implemented Controlled Disclosure & WhatsApp Proposal Engine (T-010), 14. Release Readiness and Security Review, 1. Executive Summary, 2. Complete Task Ledger Status (T-001 through T-013), 3. Decision Log & Policy Resolutions (16 Architectural Decisions), 4. Security Posture & Threat Model Verification, 5. Capacity & Scale Verification Summary (+35 more)

### Community 7 - "ref_node_assert"
Cohesion: 0.11
Nodes (17): REPO_ROOT, __dirname, __filename, MIGRATION_PATH, __dirname, __filename, MIGRATION_PATH, MIGRATION_PATH (+9 more)

### Community 8 - "lib/finance.ts"
Cohesion: 0.08
Nodes (34): T-012 — Auditable financial ledger, T-026 — Financial ledger correctness and persistence, 4.7 Financial workflows (T-012 — Auditable Financial Ledger), 16. Production Monitoring, Alerting & Incident Response Runbook, 1.1 Five-Component Health Boundary (`CFG-04`), 1. System Health & Telemetry Architecture, 2. Automated Alert Triggers & Paging Thresholds, 3. Incident Response Runbooks (+26 more)

### Community 9 - "2026-11-14"
Cohesion: 0.15
Nodes (17): T-027 — Frontend application and feature-boundary refactor, 2026-11-14, useAuditLogs(), UseAuditLogsResult, useCRM(), useFinance(), useMatchmakers(), useProfiles() (+9 more)

### Community 10 - "Backend Tests & QA Verification"
Cohesion: 0.10
Nodes (36): T-011 — Follow-ups and external matchmaker attribution, T-025 — External matchmaker agreements, CRM and follow-ups, 4.1 API approach, 4.3 Profile update and duplicate review, 4.4 Search, 4.5 Match review, 4.6 Controlled sharing, 4.8 Follow-ups and External Matchmaker Attribution (T-011) (+28 more)

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

### Community 26 - "public.share_grants"
Cohesion: 0.18
Nodes (12): idx_share_grants_expiry, idx_share_grants_profile, idx_share_grants_token_hash, public.share_grants, idx_share_grants_match_case, idx_storage_objects_bucket_name, public.create_share_grant(), public.execute_candidate_privacy_erasure() (+4 more)

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
Cohesion: 0.29
Nodes (5): UseCRMResult, DetailedFollowUpItem, crmRepository, ICRMRepository, FollowUpItem

### Community 34 - "Architecture & Specifications"
Cohesion: 0.18
Nodes (10): 1. Mandatory startup reading, 2. Product invariants, 3. Security and privacy, 4. Repository workflow, 5. Select exactly one task, 6. Before coding, 7. Implement and verify, 8. Update documentation and queue (+2 more)

### Community 35 - ".create"
Cohesion: 0.11
Nodes (19): T-021 — Database schema completion and typed persistence repositories, P0-03 — Self-service profile creation is rejected by the database, P0-04 — Consent schema contradicts the profile write path and defaults, P1-08 — Profile wizard still manufactures candidate facts, P1-11 — Preferences persistence is incomplete and has a type mismatch, P1-12 — Sibling and property persistence is lossy, P1-13 — Profile create is not transactional, P1-14 — Generated profile reference codes can collide (+11 more)

### Community 36 - "Architecture & Specifications"
Cohesion: 0.22
Nodes (9): 1.1 Product context, 1.2 Current frontend — preserve it, 1.3 Backend baseline, 1.4 Trust boundaries, 1.5 Proposed logical architecture, 1.6 Architecture principles, 1.7 Environments and configuration, 1.8 Docker decision (+1 more)

### Community 37 - "Architecture & Specifications"
Cohesion: 0.20
Nodes (9): 1. Authority and ownership, 2. Truthfulness and customer data, 3. Privacy and security, 4. Business authority and AI, 5. Engineering boundaries, 6. Mandatory task workflow, 7. Status vocabulary, 8. Module completion rule (+1 more)

### Community 38 - "supabaseClient.ts"
Cohesion: 0.30
Nodes (9): T-020 — Refactor Workstream W1: Configuration schema, production demo-mode rejection & distinct service health, BackendHealthStatus, ClientConfig, ConfigValidationResult, getBackendHealthStatus(), resetClientConfigForTesting(), ServiceComponentHealth, validateClientConfig() (+1 more)

### Community 39 - "repositories.test.ts"
Cohesion: 0.14
Nodes (13): 3.3 Property Details & Pakistani Land Measurement (`PropertyDetails`), 3.4 Partner Preferences & Multi-Tier Criteria Classification (`PartnerPreference`), Field Inventory, Invariants & Classification Enum, Land Unit Conversion Invariants & Regional Variations, photoRepository, shareGrantRepository, adminSession (+5 more)

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
Cohesion: 0.15
Nodes (23): P0-05 — Profile lifecycle state machine is not enforced by the database, P1-09 — DTO fallback still fabricates a property object, P1-10 — Nested database DTOs are not mapped from snake_case to camelCase, canTransitionStatus(), demoProfiles, formatInchesToHeight(), parseHeightToInches(), PERMITTED_STATUS_TRANSITIONS (+15 more)

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
Cohesion: 0.18
Nodes (10): `00001_initial_schema_baseline.sql`, `00005_auth_lifecycle_ownership_and_audit.sql`, `00006_profile_intake_and_ownership_enhancements.sql`, `00007_storage_and_share_grants_enhancements.sql`, 1. File Naming Convention, 2. Mandatory Migration Safety Invariants, 3. Migration Tooling & Deployment Runner, 4. Migration Catalog & Recovery Limits (+2 more)

### Community 51 - "Frontend Components & UI Layout"
Cohesion: 0.29
Nodes (7): scripts, build, clean, dev, lint, preview, test

### Community 52 - "package.json"
Cohesion: 0.67
Nodes (3): devDependencies, supabase@^3.1.0, supabase

### Community 53 - "public.profiles"
Cohesion: 0.26
Nodes (13): idx_audit_events_created_at, idx_audit_events_target, idx_candidate_consents_profile_id, idx_profiles_caste, idx_profiles_created_at, idx_profiles_created_by, idx_profiles_current_city, idx_profiles_gender (+5 more)

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
Cohesion: 0.10
Nodes (28): T-008 — Private photos and consent-gated access, T-023 — Private photos, consent events, protected grants and disclosure, 3.10 Private photo storage and consent-gated access (T-008), P0-07 — Photo upload, signed grants and deletion are in-memory only, P1-28 — Privacy erasure only touches the demo photo map, activeGrantsByHash, activeGrantsByToken, ALLOWED_MIME_TYPES (+20 more)

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

### Community 62 - "auth.ts"
Cohesion: 0.19
Nodes (13): AuthResult, AuthUser, currentSession, DEFAULT_SESSION_DURATION_MS, initSession(), listeners, notifyListeners(), resetAuthForTesting() (+5 more)

### Community 63 - "3. Detailed Domain Model Inventory"
Cohesion: 0.12
Nodes (17): T-033 — Profile repository UUID mapping, complete nested DTO mapping, transactional create/update, customer self-service and assisted ownership, 3.1 Candidate Profile Entity (`ProfileRecord`), 3.2 Sibling Repeating Structure (`SiblingRecord`), 3.5 Match Recommendation & Review Lifecycle (`MatchRecommendation`), 3.6 Controlled Sharing & Granular Disclosure (`DisclosureOptions`), 3.7 Follow-Up & CRM Task Engine (`FollowUpItem`), 3.8 Collaborative Financial Ledger (`FinancialTransaction`, `ExternalMatchmaker`), 3.9 Audit Trail (`AuditLogItem`) (+9 more)

### Community 64 - "4. Confirmed P1 functional and data-integrity issues"
Cohesion: 0.33
Nodes (6): 4. Confirmed P1 functional and data-integrity issues, FINANCE, P1-35 — Reversal references mix database UUID and human transaction reference, P1-36 — Duplicate reversal is not prevented atomically, P1-37 — Paid/received transaction types default to pending in the repository, P1-38 — Reconciliation is not a true double-entry balance proof

### Community 65 - "1.2 Findings register"
Cohesion: 0.20
Nodes (10): 1.2 Findings register, A. Authentication, identity and authorization, B. Configuration and demo isolation, C. Persistence and data model, D. Profile intake and migration, E. Consent, photos, privacy and sharing, F. Matching and AI, G. Sharing and WhatsApp (+2 more)

### Community 66 - "canTransitionStatus"
Cohesion: 0.17
Nodes (16): T-007 — Profile create/read/update and review lifecycle, T-015 — Sibling profiles and structured property holdings integration, 4.2 Profile registration and review, Customer registration, DTO and Database Row Separation (T-007), Review transitions (Approved & Implemented in T-007), Sibling and Property Validation (Approved & Implemented in T-015 / OPEN-011), Staff-created profile (+8 more)

### Community 67 - "6. Additional architecture and product gaps"
Cohesion: 0.22
Nodes (9): 6. Additional architecture and product gaps, P2-01 — No first-party Edge Function/API implementation was found, P2-02 — Regional land conventions are not passed into all calculations, P2-03 — Contact form and operational contact details need final wiring, P2-04 — Unused/legacy application artifacts create ambiguity, P2-05 — No automated retention/purge scheduler is present, P2-06 — No reminder delivery integration is present, P2-07 — Staff MFA and recovery policy remains unresolved (+1 more)

### Community 71 - "6. Frontend Integration Guide"
Cohesion: 0.22
Nodes (8): 6.1 Goal, 6.2 Do not rewrite the app, 6.3 Introduce a typed data-access boundary, 6.4 Suggested migration sequence, 6.5 UI and state rules, 6.6 Existing domain mismatches to address deliberately, 6.7 Demo data, 6. Frontend Integration Guide

### Community 72 - "repositories.ts"
Cohesion: 0.06
Nodes (26): UseProfilesResult, UseSettingsResult, AppSettings, demoAgreementsStore, demoAuditLogsStore, demoFollowUpsStore, demoMatchCasesStore, demoMatchDecisionsStore (+18 more)

### Community 73 - "2. Implementation and Refactoring Blueprint"
Cohesion: 0.25
Nodes (5): 2.1 Objective and target architecture, 2.2 Preserve source meaning, 2.4 File-level refactor map, 2.5 Dependency and stop rules, 2. Implementation and Refactoring Blueprint

### Community 74 - "migration.ts"
Cohesion: 0.08
Nodes (46): T-028 — Staged WhatsApp and phone-gallery migration, Runbook 4: Migration Batch Rollback, P1-39 — Staging engine does not use the new migration tables, P1-40 — Importer fabricates candidate facts, P1-41 — Import “merge_update” does not merge, P1-42 — Batch import is not atomic, P1-43 — Consent parser treats text mentions as consent proof, P1-44 — Gallery migration metadata is not a photo import (+38 more)

### Community 75 - "AuthSession"
Cohesion: 0.17
Nodes (10): canAccessRole(), getClientConfig(), generateCryptoUUID(), persistShareGrantAsync(), revokeShareGrantAsync(), CRMRepositoryImpl, FinanceRepositoryImpl, MatchRepositoryImpl (+2 more)

### Community 76 - "AuthSession"
Cohesion: 0.13
Nodes (10): UseMatchmakersResult, AuthSession, IMatchmakerRepository, IMatchRepository, IProfileRepository, matchmakerRepository, MatchmakerRepositoryImpl, resetMatchmakerRepositoryForTesting() (+2 more)

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
Cohesion: 0.25
Nodes (8): AUTHENTICATION AND CONFIGURATION, P1-01 — Auth state callback performs awaited Supabase calls, P1-02 — Staging can silently fall back to demo mode, P1-03 — Unknown environment labels silently become development, P1-04 — Non-local HTTP Supabase URLs are accepted, P1-05 — Health status overstates actual service availability, P1-06 — CI secret scan is too narrow, P1-07 — Default Supabase auth persistence uses browser local storage

### Community 81 - "security_role_matrix.test.js"
Cohesion: 0.40
Nodes (3): adminSession, customerSession, nadeemSession

### Community 82 - "Module 01 — Authentication and Session Integrity"
Cohesion: 0.14
Nodes (13): 10. Status, 1. Objective, 2. Evidence from the audited repository, 3. Scope of this module, 4. Required behavior, 5. Permitted implementation files, 6. Acceptance criteria, 7. Test plan (+5 more)

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

### Community 87 - "ref_node_url"
Cohesion: 0.12
Nodes (12): __dirname, __filename, FOLLOWUPS_CODE_PATH, MIGRATION_PATH, OPEN_DECISIONS_PATH, __dirname, __filename, MATCHING_CODE_PATH (+4 more)

### Community 89 - "public.user_roles"
Cohesion: 0.18
Nodes (12): idx_user_roles_user_id, public.auth_has_role(), public.auth_is_staff(), public.user_roles, idx_user_profiles_email, public.user_profiles, idx_profiles_account_id, public.auth_is_account_active() (+4 more)

### Community 90 - "T-034 — Real private Storage, Storage RLS, consent withdrawal, server-side share issue/redeem/revoke and privacy erasure"
Cohesion: 0.23
Nodes (7): T-034 — Real private Storage, Storage RLS, consent withdrawal, server-side share issue/redeem/revoke and privacy erasure, resolveCandidatePhotoUrl(), IPhotoRepository, PhotoRepositoryImpl, ProfileRepositoryImpl, resetPhotoRepositoryForTesting(), resetProfileRepositoryForTesting()

### Community 91 - "00004_staged_migration_batches.sql"
Cohesion: 0.29
Nodes (9): idx_profile_preferences_profile, public.profile_preferences, idx_migration_batches_created_at, idx_migration_batches_status, idx_migration_records_batch_id, idx_migration_records_conflict, idx_migration_records_status, public.migration_batches (+1 more)

### Community 92 - "5. Matching Engine and Controlled Sharing"
Cohesion: 0.20
Nodes (10): 5.1 Purpose and non-goals, 5.2 Matching pipeline, 5.3 Existing frontend logic is not authoritative, 5.4 Required evaluation record, 5.5 Fairness and sensitive criteria, 5.6 Controlled WhatsApp message, 5.7 Protected links, 5.8 WhatsApp behavior (+2 more)

### Community 93 - "AuthorizedDisclosureSnapshot"
Cohesion: 0.27
Nodes (4): AuthorizedDisclosureSnapshot, IShareGrantRepository, resetShareGrantRepositoryForTesting(), ShareGrantRepositoryImpl

### Community 94 - "Module 01 — Supabase Auth Integration Specification"
Cohesion: 0.20
Nodes (9): 1. Approved decision, 2. Pre-existing C-01 work, 3. Technical integration requirements, 4. Account creation policy is unresolved unless the SRS explicitly answers it, 5. Authorization and RLS, 6. Redirects and email delivery, 7. Tests, 9. Current known environment limitation (+1 more)

### Community 95 - "signInWithPassword"
Cohesion: 0.39
Nodes (8): 3.9 Client session and access control integration (T-006), AuthModal(), AuthModalProps, isValidEmail(), providerUnavailableError(), sendMagicLink(), signInWithPassword(), isBackendConfigured()

### Community 96 - "10. Frontend Domain Inventory for Backend Mapping"
Cohesion: 0.22
Nodes (9): 10. Frontend Domain Inventory for Backend Mapping, 1. Executive Summary & Purpose, 2. Frontend Tooling & Runtime Environment Baseline, 4.1 Prototype Persona Switching vs. Trusted Authentication, 4.2 Photo Privacy & Storage Boundary, 4. Security, Authorization & Privacy Boundaries, 5. Cross-Reference to Open Decisions, 6. Verification & Traceability Summary (+1 more)

### Community 97 - "matching.ts"
Cohesion: 0.29
Nodes (7): CriterionResult, EvaluatedCriterion, IMPORTANCE_WEIGHTS, MATCHING_ALGORITHM_VERSION, PreShareEligibilityResult, MatchEvaluationRecord, CriteriaImportance

### Community 98 - "CRM AND EXTERNAL MATCHMAKERS"
Cohesion: 0.33
Nodes (6): CRM AND EXTERNAL MATCHMAKERS, P1-30 — CRM profile linkage is not persisted, P1-31 — CRM fallback values fabricate contact identity, P1-32 — Matchmaker code is used where database UUID is required, P1-33 — Tiered partner commission model is not represented in the SQL agreement table, P1-34 — Referral attribution only increments a counter

### Community 99 - "PHOTOS, CONSENT AND SHARING"
Cohesion: 0.40
Nodes (5): P1-25 — No Storage object policies are defined in the migrations, P1-26 — Photo display maps a storage path to an image URL, P1-27 — Share grant schema does not store the claimed fixed snapshot/match binding, P1-29 — Bureau office contact is an explicit placeholder, PHOTOS, CONSENT AND SHARING

### Community 100 - "recordMatchDecision"
Cohesion: 0.67
Nodes (3): T-009 — Preferences and deterministic matching, 5.10 Implemented Deterministic Matching Specification (T-009), recordMatchDecision()

### Community 101 - "public.profile_photos"
Cohesion: 0.67
Nodes (3): idx_profile_photos_primary, idx_profile_photos_profile, public.profile_photos

## Knowledge Gaps
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ProfileRecord` connect `App.tsx` to `matching.ts`, `canTransitionStatus`, `.create`, `matching.test.ts`, `disclosure.ts`, `repositories.test.ts`, `repositories.ts`, `migration.ts`, `AuthSession`, `AuthSession`, `profiles.test.ts`, `T-034 — Real private Storage, Storage RLS, consent withdrawal, server-side share issue/redeem/revoke and privacy erasure`, `Architecture & Specifications`, `3. Detailed Domain Model Inventory`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `ProfileRecord` (e.g. with `T-007 — Profile create/read/update and review lifecycle` and `T-033 — Profile repository UUID mapping, complete nested DTO mapping, transactional create/update, customer self-service and assisted ownership`) actually correct?**
  _`ProfileRecord` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05366726296958855 - nodes in this community are weakly interconnected._
- **Why does `AuthSession` connect `AuthSession` to `App.tsx`, `auth.test.ts`, `matching.test.ts`, `disclosure.ts`, `lib/finance.ts`, `2026-11-14`, `Backend Tests & QA Verification`, `FollowUpItem`, `.create`, `repositories.test.ts`, `profiles.test.ts`, `photos.ts`, `auth.ts`, `repositories.ts`, `migration.ts`, `AuthSession`, `T-034 — Real private Storage, Storage RLS, consent withdrawal, server-side share issue/redeem/revoke and privacy erasure`, `AuthorizedDisclosureSnapshot`, `matching.ts`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Should `00003_complete_normalized_schema.sql` be split into smaller, more focused modules?**
  _Cohesion score 0.14492753623188406 - nodes in this community are weakly interconnected._
- **Why does `Tasks` connect `Tasks` to `App.tsx`, `auth.test.ts`, `matching.test.ts`, `disclosure.ts`, `lib/finance.ts`, `2026-11-14`, `Backend Tests & QA Verification`, `deploy-migrations.js`, `.create`, `supabaseClient.ts`, `capacity-benchmark.js`, `photos.ts`, `3. Detailed Domain Model Inventory`, `canTransitionStatus`, `migration.ts`, `accessibility.ts`, `AI Agent Task Queue — Gulistan Marriage Bureau`, `T-034 — Real private Storage, Storage RLS, consent withdrawal, server-side share issue/redeem/revoke and privacy erasure`, `recordMatchDecision`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Should `disclosure.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06471631205673758 - nodes in this community are weakly interconnected._