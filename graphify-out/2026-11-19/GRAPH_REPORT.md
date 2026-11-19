# Graph Report - gulistan-marriage-bureau  (2026-11-19)

## Corpus Check
- 142 files · ~153,844 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 5, .example 1, .css 1)

## Summary
- 1440 nodes · 2988 edges · 74 communities (70 shown, 4 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 225 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ff8dd258`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App.tsx
- profiles.ts
- Database Schema & Migrations
- auth.ts
- Backend Tests & QA Verification
- 5. P1 test, scale and operational evidence gaps
- disclosure.ts
- ref_node_assert
- lib/finance.ts
- useFinance.ts
- Backend Tests & QA Verification
- appearance.test.ts
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
- Authentication & Access Control
- Architecture & Specifications
- Backend Tests & QA Verification
- Architecture & Specifications
- Tasks
- Database Schema & Migrations
- .create
- Architecture & Specifications
- DEPLOYMENT AND DATABASE
- Architecture & Specifications
- Architecture & Specifications
- AuthSession
- computeSha256
- Architecture & Specifications
- FollowUpItem
- Architecture & Specifications
- Architecture & Specifications
- Frontend Components & UI Layout
- Subsystem Community 45
- PHOTOS, CONSENT AND SHARING
- Architecture & Specifications
- Architecture & Specifications
- Architecture & Specifications
- Database Schema & Migrations
- Frontend Components & UI Layout
- package.json
- Architecture & Specifications
- Database Schema & Migrations
- 3. Authorization, Privacy and Threat Model
- photos.ts
- Database Schema & Migrations
- controlled_disclosure.test.js
- Architecture & Specifications
- Backend Tests & QA Verification
- Architecture & Specifications
- Frontend Components & UI Layout
- MockStorage
- 6. Frontend Integration Guide
- repositories.ts
- migration.ts
- getClientConfig
- canAccessRole
- steps
- ref_node_test
- accessibility.ts
- 10. Frontend Domain Inventory for Backend Mapping
- followups_crm.test.js

## God Nodes (most connected - your core abstractions)
1. `AuthSession` - 90 edges
2. `ProfileRecord` - 50 edges
3. `canAccessRole()` - 45 edges
4. `getClientConfig()` - 44 edges
5. `Tasks` - 41 edges
6. `getSupabaseClient()` - 38 edges
7. `2026-11-14` - 37 edges
8. `App()` - 34 edges
9. `Language` - 33 edges
10. `react` - 27 edges

## Surprising Connections (you probably didn't know these)
- `T-006 — Authentication and session integration` --references--> `canAccessRole()`  [INFERRED]
  backend/AGENT_TASK_QUEUE.md → frontend/src/lib/auth.ts
- `P1-24 — Match decision state is not restored into evaluation DTO` --references--> `verifyPreShareEligibility()`  [INFERRED]
  backend/docs/refactor/05-INDEPENDENT-REPOSITORY-AUDIT-2026-11-15.md → frontend/src/lib/matching.ts
- `Runbook 4: Migration Batch Rollback` --references--> `reconcileMigrationBatch()`  [INFERRED]
  backend/docs/16-monitoring-and-incident-runbook.md → frontend/src/lib/migration.ts
- `2.3 Profile field mapping from the current UI` --references--> `ProfileRecord`  [INFERRED]
  backend/docs/02-data-model.md → frontend/src/types/index.ts
- `2026-11-14` --references--> `evaluateQueryPlan()`  [INFERRED]
  BIBLE/CHANGELOG.md → backend/scripts/capacity-benchmark.js

## Import Cycles
- None detected.

## Communities (74 total, 4 thin omitted)

### Community 0 - "App.tsx"
Cohesion: 0.05
Nodes (102): T-018 — Permanent language persistence across browser, cold load, and all stakeholder profiles, 6.6 Existing domain mismatches to address deliberately, 3.1 Candidate Profile Entity (`ProfileRecord`), 3.2 Sibling Repeating Structure (`SiblingRecord`), 3.3 Property Details & Pakistani Land Measurement (`PropertyDetails`), 3.5 Match Recommendation & Review Lifecycle (`MatchRecommendation`), 3.6 Controlled Sharing & Granular Disclosure (`DisclosureOptions`), 3.7 Follow-Up & CRM Task Engine (`FollowUpItem`) (+94 more)

### Community 1 - "profiles.ts"
Cohesion: 0.06
Nodes (53): T-007 — Profile create/read/update and review lifecycle, T-015 — Sibling profiles and structured property holdings integration, T-021 — Database schema completion and typed persistence repositories, 4.2 Profile registration and review, Customer registration, DTO and Database Row Separation (T-007), Review transitions (Approved & Implemented in T-007), Sibling and Property Validation (Approved & Implemented in T-015 / OPEN-011) (+45 more)

### Community 2 - "Database Schema & Migrations"
Cohesion: 0.06
Nodes (58): idx_audit_events_created_at, idx_audit_events_target, idx_candidate_consents_profile_id, idx_profiles_caste, idx_profiles_created_at, idx_profiles_created_by, idx_profiles_current_city, idx_profiles_gender (+50 more)

### Community 3 - "auth.ts"
Cohesion: 0.06
Nodes (55): T-019 — Module 01 / Workstream W0: Supabase Auth integration, trusted role mapping & C-01 completion, T-020 — Refactor Workstream W1: Configuration schema, production demo-mode rejection & distinct service health, 3.9 Client session and access control integration (T-006), AUTHENTICATION AND CONFIGURATION, P0-16 — Suspended/pending user account status is not enforced during authentication, P1-01 — Auth state callback performs awaited Supabase calls, P1-02 — Staging can silently fall back to demo mode, P1-03 — Unknown environment labels silently become development (+47 more)

### Community 4 - "Backend Tests & QA Verification"
Cohesion: 0.08
Nodes (30): T-009 — Preferences and deterministic matching, T-024 — Deterministic matching, persisted evaluations and Nadeem approvals, 5.10 Implemented Deterministic Matching Specification (T-009), 5.1 Purpose and non-goals, 5.2 Matching pipeline, 5.3 Existing frontend logic is not authoritative, 5.4 Required evaluation record, 5.5 Fairness and sensitive criteria (+22 more)

### Community 5 - "5. P1 test, scale and operational evidence gaps"
Cohesion: 0.07
Nodes (28): 1. Executive verdict, 2. Scope and evidence limits, 3. Confirmed P0 release blockers, 5. P1 test, scale and operational evidence gaps, 6. Additional architecture and product gaps, 7. Owner actions that code agents cannot safely do alone, 8. Required remediation sequence, 9. Final acceptance rule (+20 more)

### Community 6 - "disclosure.ts"
Cohesion: 0.11
Nodes (24): T-010 — Controlled disclosure and WhatsApp draft generation, 5.11 Implemented Controlled Disclosure & WhatsApp Proposal Engine (T-010), 4. Security Posture & Threat Model Verification, activeShareGrantsByHash, activeShareGrantsByToken, AuthorizedDisclosedData, AuthorizedDisclosureSnapshot, authorizeDisclosure() (+16 more)

### Community 7 - "ref_node_assert"
Cohesion: 0.10
Nodes (17): REPO_ROOT, __dirname, __filename, MIGRATION_PATH, __dirname, __filename, MIGRATION_PATH, __dirname (+9 more)

### Community 8 - "lib/finance.ts"
Cohesion: 0.06
Nodes (48): T-012 — Auditable financial ledger, T-026 — Financial ledger correctness and persistence, 4.1 API approach, 4.3 Profile update and duplicate review, 4.4 Search, 4.5 Match review, 4.6 Controlled sharing, 4.7 Financial workflows (T-012 — Auditable Financial Ledger) (+40 more)

### Community 9 - "useFinance.ts"
Cohesion: 0.19
Nodes (9): FINANCE, P1-36 — Duplicate reversal is not prevented atomically, P1-37 — Paid/received transaction types default to pending in the repository, P1-38 — Reconciliation is not a true double-entry balance proof, UseFinanceResult, BureauReconciliationSummary, PartnerLedgerSummary, FinanceRepositoryImpl (+1 more)

### Community 10 - "Backend Tests & QA Verification"
Cohesion: 0.13
Nodes (29): T-011 — Follow-ups and external matchmaker attribution, T-025 — External matchmaker agreements, CRM and follow-ups, 4.8 Follow-ups and External Matchmaker Attribution (T-011), attributeProfileToMatchmaker(), auditEventsStore, canAccessCRM(), completeFollowUp(), computeFollowUpStatus() (+21 more)

### Community 11 - "appearance.test.ts"
Cohesion: 0.19
Nodes (8): ScrollAnimationBackground(), CLARITY_CHANGE_EVENT, CLARITY_STORAGE_KEY, ClarityMode, resolveInitialClarity(), eventListeners, MockStorage, storage

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
Cohesion: 0.06
Nodes (31): 1.1 Executive status and authentication discrepancy, 1.2 Findings register, 1.3 Contradictions to reconcile, 1.4 Key files, 1.5 Limits, 1. Comprehensive Repository Audit, A. Authentication, identity and authorization, B. Configuration and demo isolation (+23 more)

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

### Community 26 - "Authentication & Access Control"
Cohesion: 0.15
Nodes (12): 10. Status, 1. Objective, 2. Evidence from the audited repository, 3. Scope of this module, 4. Required behavior, 5. Permitted implementation files, 6. Acceptance criteria, 7. Test plan (+4 more)

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
Cohesion: 0.07
Nodes (39): AI Agent Task Queue — Gulistan Marriage Bureau, Execution protocol, Status meanings, T-001 — Inventory frontend domain contracts for backend mapping, T-002 — Prepare minimum owner decision sheet, T-003 — Establish backend tooling without production connections, T-004 — First approved database migration and access-control baseline, T-005 — Typed backend client/configuration boundary (+31 more)

### Community 32 - "Database Schema & Migrations"
Cohesion: 0.38
Nodes (8): OPS-03 — Live smoke test can report false security success, __dirname, __filename, MIGRATIONS_DIR, runSmokeTests(), validateEnvironmentSanity(), validateSecurityBaseline(), validateStorageSecurity()

### Community 33 - ".create"
Cohesion: 0.14
Nodes (14): 4. Confirmed P1 functional and data-integrity issues, CRM AND EXTERNAL MATCHMAKERS, MATCHING AND DISCLOSURE, P0-11 — Customer correction request path cannot pass real authorization, P1-20 — Approval can be recorded when no evaluation exists, P1-21 — Match approval and match-case status update are not atomic, P1-22 — Approval identity is not constrained to Nadeem at the database boundary, P1-23 — Match-case uniqueness does not prevent reversed duplicate pairs (+6 more)

### Community 34 - "Architecture & Specifications"
Cohesion: 0.18
Nodes (10): 1. Mandatory startup reading, 2. Product invariants, 3. Security and privacy, 4. Repository workflow, 5. Select exactly one task, 6. Before coding, 7. Implement and verify, 8. Update documentation and queue (+2 more)

### Community 35 - "DEPLOYMENT AND DATABASE"
Cohesion: 0.15
Nodes (13): DEPLOYMENT AND DATABASE, P0-01 — Live migration runner is a false-success implementation, P0-02 — No PostgreSQL driver or executable migration service is present, P0-03 — Self-service profile creation is rejected by the database, P0-04 — Consent schema contradicts the profile write path and defaults, P0-05 — Profile lifecycle state machine is not enforced by the database, P0-06 — Match-case creation sends human reference codes to UUID columns, P0-08 — Controlled disclosure grants are not persisted or redeemable (+5 more)

### Community 36 - "Architecture & Specifications"
Cohesion: 0.22
Nodes (9): 1.1 Product context, 1.2 Current frontend — preserve it, 1.3 Backend baseline, 1.4 Trust boundaries, 1.5 Proposed logical architecture, 1.6 Architecture principles, 1.7 Environments and configuration, 1.8 Docker decision (+1 more)

### Community 37 - "Architecture & Specifications"
Cohesion: 0.20
Nodes (9): 1. Authority and ownership, 2. Truthfulness and customer data, 3. Privacy and security, 4. Business authority and AI, 5. Engineering boundaries, 6. Mandatory task workflow, 7. Status vocabulary, 8. Module completion rule (+1 more)

### Community 38 - "AuthSession"
Cohesion: 0.17
Nodes (5): AuthSession, MatchEvaluation, IFinanceRepository, IMatchRepository, IProfileRepository

### Community 39 - "computeSha256"
Cohesion: 0.20
Nodes (9): computeSha256(), generateSecureToken(), revokeShareGrant(), generateSignedPhotoGrant(), revokeSignedPhotoGrant(), validateSignedPhotoAccess(), resetSupabaseClientForTesting(), setSupabaseClientForTesting() (+1 more)

### Community 40 - "Architecture & Specifications"
Cohesion: 0.22
Nodes (8): 8.1 Mandatory first steps, 8.2 Preserve existing work, 8.3 Security rules, 8.4 Database and migration rules, 8.5 Coding standards, 8.6 Required completion report, 8.7 Definition of done, 8. AI Agent Operating Contract

### Community 41 - "FollowUpItem"
Cohesion: 0.43
Nodes (3): DetailedFollowUpItem, ICRMRepository, FollowUpItem

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

### Community 46 - "PHOTOS, CONSENT AND SHARING"
Cohesion: 0.25
Nodes (9): T-023 — Private photos, consent events, protected grants and disclosure, P1-25 — No Storage object policies are defined in the migrations, P1-26 — Photo display maps a storage path to an image URL, P1-27 — Share grant schema does not store the claimed fixed snapshot/match binding, P1-28 — Privacy erasure only touches the demo photo map, P1-29 — Bureau office contact is an explicit placeholder, PHOTOS, CONSENT AND SHARING, executeCandidatePrivacyErasure() (+1 more)

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
Cohesion: 0.25
Nodes (7): `00001_initial_schema_baseline.sql`, 1. File Naming Convention, 2. Mandatory Migration Safety Invariants, 3. Migration Tooling & Deployment Runner, 4. Migration Catalog & Recovery Limits, Database Migrations — Gulistan Marriage Bureau, Schema Migrations Tracking Table (`public.schema_migrations`)

### Community 51 - "Frontend Components & UI Layout"
Cohesion: 0.29
Nodes (7): scripts, build, clean, dev, lint, preview, test

### Community 52 - "package.json"
Cohesion: 0.67
Nodes (3): devDependencies, supabase@^3.1.0, supabase

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
Cohesion: 0.12
Nodes (22): T-008 — Private photos and consent-gated access, 3.10 Private photo storage and consent-gated access (T-008), P0-07 — Photo upload, signed grants and deletion are in-memory only, activeGrantsByHash, activeGrantsByToken, ALLOWED_MIME_TYPES, DEFAULT_PHOTO_EXPIRY_MS, demoPhotos (+14 more)

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

### Community 71 - "6. Frontend Integration Guide"
Cohesion: 0.25
Nodes (7): 6.1 Goal, 6.2 Do not rewrite the app, 6.3 Introduce a typed data-access boundary, 6.4 Suggested migration sequence, 6.5 UI and state rules, 6.7 Demo data, 6. Frontend Integration Guide

### Community 72 - "repositories.ts"
Cohesion: 0.05
Nodes (35): UseAuditLogsResult, UseCRMResult, UseSettingsResult, AppSettings, auditRepository, crmRepository, demoAgreementsStore, demoAuditLogsStore (+27 more)

### Community 74 - "migration.ts"
Cohesion: 0.06
Nodes (57): T-027 — Frontend application and feature-boundary refactor, T-028 — Staged WhatsApp and phone-gallery migration, P1-39 — Staging engine does not use the new migration tables, P1-40 — Importer fabricates candidate facts, P1-41 — Import “merge_update” does not merge, P1-42 — Batch import is not atomic, P1-43 — Consent parser treats text mentions as consent proof, P1-44 — Gallery migration metadata is not a photo import (+49 more)

### Community 75 - "getClientConfig"
Cohesion: 0.23
Nodes (5): getClientConfig(), CRMRepositoryImpl, MatchRepositoryImpl, ProfileRepositoryImpl, getSupabaseClient()

### Community 76 - "canAccessRole"
Cohesion: 0.18
Nodes (7): UseMatchmakersResult, canAccessRole(), IMatchmakerRepository, MatchmakerRepositoryImpl, resetMatchmakerRepositoryForTesting(), DetailedExternalMatchmaker, PartnerAgreement

### Community 77 - "steps"
Cohesion: 0.08
Nodes (23): concurrency, cancel-in-progress, group, jobs, quality-gate, name, on, pull_request (+15 more)

### Community 81 - "ref_node_test"
Cohesion: 0.18
Nodes (7): __dirname, __filename, MATCHING_CODE_PATH, OPEN_DECISIONS_PATH, adminSession, customerSession, nadeemSession

### Community 83 - "accessibility.ts"
Cohesion: 0.11
Nodes (25): T-030 — Backup, restore, monitoring, Android/RTL and final release, 17. Design Theme Review & Visual Invariants, 1. Executive Summary & Review Invariant, 2. Design Theme Specifications, 3. Implementation Token Strategy (Zero-Disruption Migration), 4. Android-First & Accessibility Guarantees, Theme 1: Gulistan Heritage (Active Baseline), Theme 2: Modern Trust (Alternative Corporate Palette) (+17 more)

### Community 85 - "10. Frontend Domain Inventory for Backend Mapping"
Cohesion: 0.22
Nodes (9): 10. Frontend Domain Inventory for Backend Mapping, 1. Executive Summary & Purpose, 2. Frontend Tooling & Runtime Environment Baseline, 4.1 Prototype Persona Switching vs. Trusted Authentication, 4.2 Photo Privacy & Storage Boundary, 4. Security, Authorization & Privacy Boundaries, 5. Cross-Reference to Open Decisions, 6. Verification & Traceability Summary (+1 more)

### Community 87 - "followups_crm.test.js"
Cohesion: 0.33
Nodes (5): __dirname, __filename, FOLLOWUPS_CODE_PATH, MIGRATION_PATH, OPEN_DECISIONS_PATH

## Knowledge Gaps
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AuthSession` connect `AuthSession` to `App.tsx`, `profiles.ts`, `.create`, `auth.ts`, `Backend Tests & QA Verification`, `DEPLOYMENT AND DATABASE`, `disclosure.ts`, `repositories.ts`, `useFinance.ts`, `lib/finance.ts`, `Backend Tests & QA Verification`, `canAccessRole`, `migration.ts`, `getClientConfig`, `FollowUpItem`, `photos.ts`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `ProfileRecord` (e.g. with `T-007 — Profile create/read/update and review lifecycle` and `2.3 Profile field mapping from the current UI`) actually correct?**
  _`ProfileRecord` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.052856020648636516 - nodes in this community are weakly interconnected._
- **Why does `Tasks` connect `Tasks` to `App.tsx`, `profiles.ts`, `auth.ts`, `Backend Tests & QA Verification`, `disclosure.ts`, `lib/finance.ts`, `Backend Tests & QA Verification`, `migration.ts`, `PHOTOS, CONSENT AND SHARING`, `accessibility.ts`, `deploy-migrations.js`, `photos.ts`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Should `profiles.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05952380952380952 - nodes in this community are weakly interconnected._
- **Why does `ProfileRecord` connect `App.tsx` to `profiles.ts`, `DEPLOYMENT AND DATABASE`, `Backend Tests & QA Verification`, `disclosure.ts`, `AuthSession`, `repositories.ts`, `migration.ts`, `getClientConfig`, `Architecture & Specifications`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Should `Database Schema & Migrations` be split into smaller, more focused modules?**
  _Cohesion score 0.060285563194077206 - nodes in this community are weakly interconnected._