# Graph Report - gulistan-marriage-bureau  (2026-11-14)

## Corpus Check
- 135 files · ~143,472 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 4, .example 1, .css 1)

## Summary
- 1340 nodes · 2777 edges · 88 communities (84 shown, 4 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 159 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5224a541`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Backend Tests & QA Verification
- profiles.test.ts
- Database Schema & Migrations
- auth.ts
- Backend Tests & QA Verification
- 3. Detailed Domain Model Inventory
- disclosure.ts
- Database Schema & Migrations
- Backend Tests & QA Verification
- FinancialTransaction
- Backend Tests & QA Verification
- appearance.test.ts
- Frontend Components & UI Layout
- Infrastructure & Operations
- Infrastructure & Operations
- Architecture & Specifications
- Frontend Components & UI Layout
- Architecture & Specifications
- Subsystem Community 18
- Authentication & Access Control
- Architecture & Specifications
- Architecture & Specifications
- Database Schema & Migrations
- Frontend Components & UI Layout
- Subsystem Community 24
- Architecture & Specifications
- Authentication & Access Control
- Architecture & Specifications
- Backend Tests & QA Verification
- Architecture & Specifications
- Backend Tests & QA Verification
- Database Schema & Migrations
- Subsystem Community 33
- Architecture & Specifications
- Subsystem Community 35
- Architecture & Specifications
- Architecture & Specifications
- AuthSession
- Subsystem Community 39
- Architecture & Specifications
- FollowUpItem
- Architecture & Specifications
- Architecture & Specifications
- Frontend Components & UI Layout
- Subsystem Community 45
- Subsystem Community 46
- Architecture & Specifications
- Architecture & Specifications
- Architecture & Specifications
- Database Schema & Migrations
- Frontend Components & UI Layout
- Subsystem Community 52
- Subsystem Community 53
- Architecture & Specifications
- Database Schema & Migrations
- 3. Authorization, Privacy and Threat Model
- photos.ts
- Database Schema & Migrations
- controlled_disclosure.test.js
- Architecture & Specifications
- Backend Tests & QA Verification
- Subsystem Community 62
- Subsystem Community 63
- Subsystem Community 64
- Subsystem Community 65
- Subsystem Community 66
- Subsystem Community 67
- Architecture & Specifications
- Frontend Components & UI Layout
- MockStorage
- 6. Frontend Integration Guide
- repositories.ts
- restore-drill.js
- migration.ts
- getClientConfig
- canAccessRole
- steps
- computeSha256
- 14. Release Readiness and Security Review
- supabaseClient.ts
- ref_node_assert
- repositories.test.ts
- canTransitionStatus
- ProfileStatus
- 10. Frontend Domain Inventory for Backend Mapping
- profiles.ts
- followups_crm.test.js

## God Nodes (most connected - your core abstractions)
1. `AuthSession` - 90 edges
2. `ProfileRecord` - 50 edges
3. `canAccessRole()` - 45 edges
4. `getClientConfig()` - 44 edges
5. `getSupabaseClient()` - 38 edges
6. `2026-11-14` - 35 edges
7. `App()` - 34 edges
8. `Language` - 32 edges
9. `Tasks` - 31 edges
10. `react` - 27 edges

## Surprising Connections (you probably didn't know these)
- `T-006 — Authentication and session integration` --references--> `canAccessRole()`  [INFERRED]
  backend/AGENT_TASK_QUEUE.md → frontend/src/lib/auth.ts
- `2.3 Profile field mapping from the current UI` --references--> `ProfileRecord`  [INFERRED]
  backend/docs/02-data-model.md → frontend/src/types/index.ts
- `3.2 Sibling Repeating Structure (`SiblingRecord`)` --references--> `SiblingRecord`  [INFERRED]
  backend/docs/10-frontend-domain-inventory.md → frontend/src/types/index.ts
- `Land Unit Conversion Invariants & Regional Variations` --references--> `convertMarlaToKanal()`  [INFERRED]
  backend/docs/10-frontend-domain-inventory.md → frontend/src/utils/units.ts
- `8. Current implementation notes` --references--> `initAuth()`  [INFERRED]
  MODULES/MODULE-01-AUTHENTICATION/01-AUTHENTICATION-REMEDIATION.md → frontend/src/lib/auth.ts

## Import Cycles
- None detected.

## Communities (88 total, 4 thin omitted)

### Community 0 - "Backend Tests & QA Verification"
Cohesion: 0.06
Nodes (90): T-018 — Permanent language persistence across browser, cold load, and all stakeholder profiles, T-027 — Frontend application and feature-boundary refactor, Invariants & Classification Enum, App(), App(), AuthModalProps, Footer(), FooterProps (+82 more)

### Community 1 - "profiles.test.ts"
Cohesion: 0.22
Nodes (14): T-015 — Sibling profiles and structured property holdings integration, T-021 — Database schema completion and typed persistence repositories, Sibling and Property Validation (Approved & Implemented in T-015 / OPEN-011), enrichPropertyDetails(), formatInchesToHeight(), parseHeightToInches(), profileDTOToRow(), resetDemoProfilesForTesting() (+6 more)

### Community 2 - "Database Schema & Migrations"
Cohesion: 0.06
Nodes (58): idx_audit_events_created_at, idx_audit_events_target, idx_candidate_consents_profile_id, idx_profiles_caste, idx_profiles_created_at, idx_profiles_created_by, idx_profiles_current_city, idx_profiles_gender (+50 more)

### Community 3 - "auth.ts"
Cohesion: 0.09
Nodes (34): T-019 — Module 01 / Workstream W0: Supabase Auth integration, trusted role mapping & C-01 completion, 3.9 Client session and access control integration (T-006), AuthModal(), AuthResult, AuthUser, buildSessionFromProvider(), currentSession, DEFAULT_SESSION_DURATION_MS (+26 more)

### Community 4 - "Backend Tests & QA Verification"
Cohesion: 0.08
Nodes (28): T-009 — Preferences and deterministic matching, 5.10 Implemented Deterministic Matching Specification (T-009), 5.1 Purpose and non-goals, 5.2 Matching pipeline, 5.3 Existing frontend logic is not authoritative, 5.4 Required evaluation record, 5.5 Fairness and sensitive criteria, 5.6 Controlled WhatsApp message (+20 more)

### Community 5 - "3. Detailed Domain Model Inventory"
Cohesion: 0.17
Nodes (12): 3.2 Sibling Repeating Structure (`SiblingRecord`), 3.5 Match Recommendation & Review Lifecycle (`MatchRecommendation`), 3.6 Controlled Sharing & Granular Disclosure (`DisclosureOptions`), 3.7 Follow-Up & CRM Task Engine (`FollowUpItem`), 3.8 Collaborative Financial Ledger (`FinancialTransaction`, `ExternalMatchmaker`), 3.9 Audit Trail (`AuditLogItem`), 3. Detailed Domain Model Inventory, Disclosed Field Toggles (+4 more)

### Community 6 - "disclosure.ts"
Cohesion: 0.12
Nodes (22): T-010 — Controlled disclosure and WhatsApp draft generation, 5.11 Implemented Controlled Disclosure & WhatsApp Proposal Engine (T-010), activeShareGrantsByHash, activeShareGrantsByToken, AuthorizedDisclosedData, authorizeDisclosure(), BUREAU_OFFICE_PHONE, BUREAU_OFFICE_TITLE_EN (+14 more)

### Community 7 - "Database Schema & Migrations"
Cohesion: 0.10
Nodes (17): REPO_ROOT, __dirname, __filename, MIGRATION_PATH, __dirname, __filename, MIGRATION_PATH, __dirname (+9 more)

### Community 8 - "Backend Tests & QA Verification"
Cohesion: 0.07
Nodes (39): AI Agent Task Queue — Gulistan Marriage Bureau, Execution protocol, Status meanings, T-001 — Inventory frontend domain contracts for backend mapping, T-002 — Prepare minimum owner decision sheet, T-003 — Establish backend tooling without production connections, T-004 — First approved database migration and access-control baseline, T-005 — Typed backend client/configuration boundary (+31 more)

### Community 9 - "FinancialTransaction"
Cohesion: 0.20
Nodes (7): UseFinanceResult, BureauReconciliationSummary, PartnerLedgerSummary, FinanceRepositoryImpl, IFinanceRepository, resetFinanceRepositoryForTesting(), FinancialTransaction

### Community 10 - "Backend Tests & QA Verification"
Cohesion: 0.10
Nodes (36): T-011 — Follow-ups and external matchmaker attribution, T-025 — External matchmaker agreements, CRM and follow-ups, 4.1 API approach, 4.3 Profile update and duplicate review, 4.4 Search, 4.5 Match review, 4.6 Controlled sharing, 4.8 Follow-ups and External Matchmaker Attribution (T-011) (+28 more)

### Community 11 - "appearance.test.ts"
Cohesion: 0.18
Nodes (9): ScrollAnimationBackground(), CLARITY_CHANGE_EVENT, CLARITY_STORAGE_KEY, ClarityMode, persistClarityPreference(), resolveInitialClarity(), eventListeners, MockStorage (+1 more)

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

### Community 17 - "Architecture & Specifications"
Cohesion: 0.12
Nodes (16): 2.1 Objective and target architecture, 2.2 Preserve source meaning, 2.3 Workstreams and order, 2.4 File-level refactor map, 2.5 Dependency and stop rules, 2. Implementation and Refactoring Blueprint, W0 — Repository baseline and authentication reconciliation (P0), W1 — Configuration and runtime boundaries (P0) (+8 more)

### Community 18 - "Subsystem Community 18"
Cohesion: 0.12
Nodes (16): description, engines, node, keywords, name, private, scripts, benchmark (+8 more)

### Community 19 - "Authentication & Access Control"
Cohesion: 0.12
Nodes (16): 2026-11-07 — Initial remediation session, 2026-11-13 — Module 01 Supabase Auth integration, trusted role mapping & C-01 verification, 2026-11-13 — Product Owner workflow decision and direct-main transfer, Actual Validation Results, Changes committed, Commit checkpoints, Direct-main transfer, Module 01 — Work Log (+8 more)

### Community 20 - "Architecture & Specifications"
Cohesion: 0.12
Nodes (15): 1.1 Executive status and authentication discrepancy, 1.2 Findings register, 1.3 Contradictions to reconcile, 1.4 Key files, 1.5 Limits, 1. Comprehensive Repository Audit, A. Authentication, identity and authorization, B. Configuration and demo isolation (+7 more)

### Community 21 - "Architecture & Specifications"
Cohesion: 0.12
Nodes (15): 3.1 Evidence levels, 3.2 P0 gates, 3.3 P1 functional gates, 3.4 P2 quality and operations, 3.5 Definition of DONE per task, 3.6 Final release decision, 3. Acceptance, Test and Release Gates, GATE A — Identity and authorization (+7 more)

### Community 22 - "Database Schema & Migrations"
Cohesion: 0.16
Nodes (13): __dirname, __filename, getMigrationStatus(), MIGRATIONS_DIR, runStatusCli(), __dirname, __filename, MIGRATIONS_DIR (+5 more)

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
Cohesion: 0.14
Nodes (13): 10. Status, 1. Objective, 2. Evidence from the audited repository, 3. Scope of this module, 4. Required behavior, 5. Permitted implementation files, 6. Acceptance criteria, 7. Test plan (+5 more)

### Community 27 - "Architecture & Specifications"
Cohesion: 0.15
Nodes (12): 2.1 Design rules, 2.2 Proposed entities, 2.3 Profile field mapping from the current UI, 2.4 Enums and controlled values, 2.5 Data integrity and indexing, 2.6 Seed data and migrations, 2. Backend Data Model, External matchmakers and finance (+4 more)

### Community 28 - "Backend Tests & QA Verification"
Cohesion: 0.15
Nodes (13): 7.1 Required quality gates, 7.2 Test layers, 7.3 Migrations, 7.4 Environments and secrets, 7.5 Backup and recovery, 7.6 Release process, 7.7 Monitoring and incidents, 7. Testing, Release and Operations (+5 more)

### Community 29 - "Architecture & Specifications"
Cohesion: 0.15
Nodes (13): 15. Staging & Production Deployment Runbook, 1. Overview & Pre-requisites, 2. Step-by-Step Provisioning Guide, 3. Applying Migrations to Live Database, 4. Smoke-Testing the Live Environment, 5. Frontend Production Release, 6. Post-Deployment Verification Checklist, Build and Deploy Command (+5 more)

### Community 30 - "Backend Tests & QA Verification"
Cohesion: 0.25
Nodes (13): AQEEDAHS, benchmarkConcurrency(), benchmarkDeterministicMatching(), benchmarkFilterQuery(), calculatePercentiles(), CASTES, CITIES, EDUCATIONS (+5 more)

### Community 32 - "Database Schema & Migrations"
Cohesion: 0.25
Nodes (11): calculateMigrationChecksum(), getMigrationPlan(), MIGRATIONS_DIR, runMigrationDeployment(), __dirname, __filename, MIGRATIONS_DIR, runSmokeTests() (+3 more)

### Community 33 - "Subsystem Community 33"
Cohesion: 0.18
Nodes (10): 13. ACCEPTANCE CRITERIA, 14. IMPLEMENTATION WORKFLOW, 1. CRITICAL REQUIREMENT: PERMANENT LANGUAGE PERSISTENCE, 9. RESPONSIVE DESIGN: REMOVE DESKTOP DUPLICATION WITHOUT BREAKING MOBILE, Desktop, FINAL INSTRUCTION, Mobile, Required behavior (+2 more)

### Community 34 - "Architecture & Specifications"
Cohesion: 0.18
Nodes (10): 1. Mandatory startup reading, 2. Product invariants, 3. Security and privacy, 4. Repository workflow, 5. Select exactly one task, 6. Before coding, 7. Implement and verify, 8. Update documentation and queue (+2 more)

### Community 35 - "Subsystem Community 35"
Cohesion: 0.20
Nodes (10): 7. BEST MATCH PAGE: STICKY SEARCH AND ADVANCED MULTI-FILTERING, A. Sticky search toolbar, B. Search capabilities, C. Multiple simultaneous filters, D. Selective filter removal, E. Filter semantics and matchmaking correctness, F. Performance, Multi-selection behavior (+2 more)

### Community 36 - "Architecture & Specifications"
Cohesion: 0.20
Nodes (9): 1.1 Product context, 1.2 Current frontend — preserve it, 1.3 Backend baseline, 1.4 Trust boundaries, 1.5 Proposed logical architecture, 1.6 Architecture principles, 1.7 Environments and configuration, 1.8 Docker decision (+1 more)

### Community 37 - "Architecture & Specifications"
Cohesion: 0.20
Nodes (9): 1. Authority and ownership, 2. Truthfulness and customer data, 3. Privacy and security, 4. Business authority and AI, 5. Engineering boundaries, 6. Mandatory task workflow, 7. Status vocabulary, 8. Module completion rule (+1 more)

### Community 38 - "AuthSession"
Cohesion: 0.15
Nodes (5): T-024 — Deterministic matching, persisted evaluations and Nadeem approvals, AuthSession, IMatchmakerRepository, IMatchRepository, IProfileRepository

### Community 39 - "Subsystem Community 39"
Cohesion: 0.22
Nodes (9): 12. REQUIRED TESTING, A. Language persistence, B. Dashboard, C. Active navigation, D. Follow-ups, E. Profiles, F. Best Match, G. Background clarity (+1 more)

### Community 40 - "Architecture & Specifications"
Cohesion: 0.22
Nodes (8): 8.1 Mandatory first steps, 8.2 Preserve existing work, 8.3 Security rules, 8.4 Database and migration rules, 8.5 Coding standards, 8.6 Required completion report, 8.7 Definition of done, 8. AI Agent Operating Contract

### Community 41 - "FollowUpItem"
Cohesion: 0.18
Nodes (7): UseCRMResult, DetailedFollowUpItem, crmRepository, CRMRepositoryImpl, ICRMRepository, resetCRMRepositoryForTesting(), FollowUpItem

### Community 42 - "Architecture & Specifications"
Cohesion: 0.25
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

### Community 46 - "Subsystem Community 46"
Cohesion: 0.29
Nodes (7): 10. DESIGN SYSTEM AND PROFESSIONAL VISUAL CONSISTENCY, Accessibility, Colors, Components, Motion, Spacing, Typography

### Community 47 - "Architecture & Specifications"
Cohesion: 0.29
Nodes (6): Decisions and privacy, Documentation and reporting, Instructions for AI Coding Agents, Project architecture, Repository rules, Start every run

### Community 48 - "Architecture & Specifications"
Cohesion: 0.29
Nodes (7): 13. Backup, Disaster Recovery and Media Restore Drill, 1. Scope & Objective, 2. Test Execution & Results, 3.1 Recovery Point Objective (RPO), 3.2 Recovery Time Objective (RTO), 3. Disaster Recovery Objectives, 4. Consent Withdrawal and Backup Interaction (OPEN-008 & OPEN-016)

### Community 49 - "Architecture & Specifications"
Cohesion: 0.29
Nodes (7): Agent entry point — read this first, Authority and conflict resolution, Core rule, Current verified repository state, Gulistan Marriage Bureau — Documentation Bible, Read the specifications in this order, Refactoring programme (2026-11-13)

### Community 50 - "Database Schema & Migrations"
Cohesion: 0.29
Nodes (6): `00001_initial_schema_baseline.sql`, 1. File Naming Convention, 2. Mandatory Migration Safety Invariants, 3. Migration Tooling, 4. Migration Catalog & Recovery Limits, Database Migrations — Gulistan Marriage Bureau

### Community 51 - "Frontend Components & UI Layout"
Cohesion: 0.29
Nodes (7): scripts, build, clean, dev, lint, preview, test

### Community 52 - "Subsystem Community 52"
Cohesion: 0.33
Nodes (6): 5. FOLLOW-UP PAGE: IMPROVE READABILITY AND VISUAL HIERARCHY, A. Increase text readability, B. Emphasize important information, C. Improve follow-up cards, D. Make actions obvious, E. Preserve functionality

### Community 53 - "Subsystem Community 53"
Cohesion: 0.33
Nodes (6): 6. PROFILE PRESENTATION: BEAUTIFUL SUMMARY, DETAILED FULL VIEW, A. Profile summary cards, B. Complete profile view, Photograph design, Privacy requirements, Summary information

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
Nodes (24): T-008 — Private photos and consent-gated access, T-023 — Private photos, consent events, protected grants and disclosure, 3.10 Private photo storage and consent-gated access (T-008), activeGrantsByHash, activeGrantsByToken, ALLOWED_MIME_TYPES, DEFAULT_PHOTO_EXPIRY_MS, demoPhotos (+16 more)

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

### Community 62 - "Subsystem Community 62"
Cohesion: 0.50
Nodes (4): 2. DASHBOARD HERO: TRANSPARENT GLASS CAPSULES, Important implementation detail, Scope restriction, Visual direction

### Community 63 - "Subsystem Community 63"
Cohesion: 0.67
Nodes (3): 11. TECHNICAL IMPLEMENTATION RULES, Architectural requirements, CSS and component quality

### Community 64 - "Subsystem Community 64"
Cohesion: 0.67
Nodes (3): 3. DASHBOARD QUICK-ACTION CARDS, Design requirements, Remove duplicate desktop navigation

### Community 65 - "Subsystem Community 65"
Cohesion: 0.67
Nodes (3): 4. ACTIVE NAVIGATION: CLEAR BLUE-AND-WHITE STATE, Active-state requirements, Navigation consistency

### Community 66 - "Subsystem Community 66"
Cohesion: 0.67
Nodes (3): 8. BACKGROUND CLARITY CONTROL: HAMBURGER MENU ONLY, Control behavior, Required placement

### Community 67 - "Subsystem Community 67"
Cohesion: 0.67
Nodes (3): GULISTAN MARRIAGE BUREAU, Professional UI/UX Refinement, Dashboard Optimization & Usability Improvements, ROLE

### Community 71 - "6. Frontend Integration Guide"
Cohesion: 0.25
Nodes (7): 6.1 Goal, 6.2 Do not rewrite the app, 6.3 Introduce a typed data-access boundary, 6.4 Suggested migration sequence, 6.5 UI and state rules, 6.7 Demo data, 6. Frontend Integration Guide

### Community 72 - "repositories.ts"
Cohesion: 0.06
Nodes (28): useSettings(), UseSettingsResult, AppSettings, AuditRepositoryImpl, demoAgreementsStore, demoAuditLogsStore, demoFollowUpsStore, demoMatchCasesStore (+20 more)

### Community 73 - "restore-drill.js"
Cohesion: 0.73
Nodes (4): computeChecksum(), createSyntheticDatabaseState(), executeRestoreDrill(), exportBackup()

### Community 74 - "migration.ts"
Cohesion: 0.10
Nodes (38): T-028 — Staged WhatsApp and phone-gallery migration, 2026-11-14, Project Changelog, generateCryptoUUID(), checkDuplicateProfile(), DuplicateDetectionResult, DuplicateMatchReason, DuplicateReviewCandidate (+30 more)

### Community 75 - "getClientConfig"
Cohesion: 0.19
Nodes (9): 2026-11-13, getClientConfig(), fetchProfiles(), profileRowToDTO(), sanitizeProfileForRole(), MatchRepositoryImpl, ProfileRepositoryImpl, resetProfileRepositoryForTesting() (+1 more)

### Community 76 - "canAccessRole"
Cohesion: 0.29
Nodes (7): UseMatchmakersResult, canAccessRole(), createProfile(), matchmakerRepository, MatchmakerRepositoryImpl, DetailedExternalMatchmaker, PartnerAgreement

### Community 77 - "steps"
Cohesion: 0.08
Nodes (23): concurrency, cancel-in-progress, group, jobs, quality-gate, name, on, pull_request (+15 more)

### Community 78 - "computeSha256"
Cohesion: 0.20
Nodes (9): computeSha256(), generateSecureToken(), revokeShareGrant(), generateSignedPhotoGrant(), revokeSignedPhotoGrant(), validateSignedPhotoAccess(), resetSupabaseClientForTesting(), setSupabaseClientForTesting() (+1 more)

### Community 79 - "14. Release Readiness and Security Review"
Cohesion: 0.29
Nodes (7): 14. Release Readiness and Security Review, 1. Executive Summary, 2. Complete Task Ledger Status (T-001 through T-013), 3. Decision Log & Policy Resolutions (16 Architectural Decisions), 4. Security Posture & Threat Model Verification, 5. Capacity & Scale Verification Summary, 6. Pre-Launch Owner Authorization Checklist

### Community 80 - "supabaseClient.ts"
Cohesion: 0.28
Nodes (10): T-020 — Refactor Workstream W1: Configuration schema, production demo-mode rejection & distinct service health, BackendHealthStatus, ClientConfig, ConfigValidationResult, getBackendHealthStatus(), resetClientConfigForTesting(), ServiceComponentHealth, validateClientConfig() (+2 more)

### Community 81 - "ref_node_assert"
Cohesion: 0.18
Nodes (7): __dirname, __filename, MATCHING_CODE_PATH, OPEN_DECISIONS_PATH, adminSession, customerSession, nadeemSession

### Community 82 - "repositories.test.ts"
Cohesion: 0.18
Nodes (10): 3.3 Property Details & Pakistani Land Measurement (`PropertyDetails`), 3.4 Partner Preferences & Multi-Tier Criteria Classification (`PartnerPreference`), Field Inventory, Land Unit Conversion Invariants & Regional Variations, financeRepository, adminSession, customerSession, staffSession (+2 more)

### Community 83 - "canTransitionStatus"
Cohesion: 0.25
Nodes (9): T-007 — Profile create/read/update and review lifecycle, 4.2 Profile registration and review, Customer registration, DTO and Database Row Separation (T-007), Review transitions (Approved & Implemented in T-007), Staff-created profile, canTransitionStatus(), ProfileRow (+1 more)

### Community 84 - "ProfileStatus"
Cohesion: 0.25
Nodes (8): 6.6 Existing domain mismatches to address deliberately, 3.1 Candidate Profile Entity (`ProfileRecord`), Fields & Types, UseProfilesResult, AuthorizedDisclosureSnapshot, ProfileFilters, profileRepository, ProfileStatus

### Community 85 - "10. Frontend Domain Inventory for Backend Mapping"
Cohesion: 0.22
Nodes (9): 10. Frontend Domain Inventory for Backend Mapping, 1. Executive Summary & Purpose, 2. Frontend Tooling & Runtime Environment Baseline, 4.1 Prototype Persona Switching vs. Trusted Authentication, 4.2 Photo Privacy & Storage Boundary, 4. Security, Authorization & Privacy Boundaries, 5. Cross-Reference to Open Decisions, 6. Verification & Traceability Summary (+1 more)

### Community 86 - "profiles.ts"
Cohesion: 0.32
Nodes (7): demoProfiles, PERMITTED_STATUS_TRANSITIONS, ProfileSummaryDTO, ProfileValidationResult, ValidationError, Gender, MaritalStatus

### Community 87 - "followups_crm.test.js"
Cohesion: 0.33
Nodes (5): __dirname, __filename, FOLLOWUPS_CODE_PATH, MIGRATION_PATH, OPEN_DECISIONS_PATH

## Knowledge Gaps
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ProfileRecord` connect `Backend Tests & QA Verification` to `profiles.test.ts`, `Backend Tests & QA Verification`, `disclosure.ts`, `AuthSession`, `repositories.ts`, `migration.ts`, `getClientConfig`, `repositories.test.ts`, `canTransitionStatus`, `ProfileStatus`, `profiles.ts`, `Architecture & Specifications`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `ProfileRecord` (e.g. with `T-007 — Profile create/read/update and review lifecycle` and `2.3 Profile field mapping from the current UI`) actually correct?**
  _`ProfileRecord` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Should `Backend Tests & QA Verification` be split into smaller, more focused modules?**
  _Cohesion score 0.05988348462267985 - nodes in this community are weakly interconnected._
- **Why does `AuthSession` connect `AuthSession` to `Backend Tests & QA Verification`, `profiles.test.ts`, `auth.ts`, `Backend Tests & QA Verification`, `disclosure.ts`, `repositories.ts`, `FollowUpItem`, `FinancialTransaction`, `Backend Tests & QA Verification`, `canAccessRole`, `Backend Tests & QA Verification`, `migration.ts`, `getClientConfig`, `repositories.test.ts`, `ProfileStatus`, `profiles.ts`, `photos.ts`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Should `Database Schema & Migrations` be split into smaller, more focused modules?**
  _Cohesion score 0.060285563194077206 - nodes in this community are weakly interconnected._
- **Why does `Tasks` connect `Backend Tests & QA Verification` to `Backend Tests & QA Verification`, `profiles.test.ts`, `auth.ts`, `Backend Tests & QA Verification`, `disclosure.ts`, `AuthSession`, `Backend Tests & QA Verification`, `migration.ts`, `supabaseClient.ts`, `canTransitionStatus`, `photos.ts`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Should `auth.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09102564102564102 - nodes in this community are weakly interconnected._