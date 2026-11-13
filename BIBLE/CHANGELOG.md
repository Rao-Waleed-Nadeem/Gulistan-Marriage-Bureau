# Project Changelog

## 2026-11-13

- Transferred C-01 fail-closed authentication remediation and associated project records directly to GitHub `main`.
- Added permanent project static rules and Antigravity implementation instructions.
- Recorded approval of Supabase Auth as the authentication provider.
- Specified staff email/password and customer/family verified magic-link authentication.
- Recorded direct commits to `main` as the repository workflow; pull requests are not to be created unless the Product Owner changes the instruction.
- Implemented Module 01 / Workstream W0: Supabase Auth integration using `@supabase/supabase-js` v2.119.0.
- Implemented staff email/password authentication with bilingual error handling.
- Implemented customer/family magic-link authentication with `shouldCreateUser: false` (prohibiting unapproved public signup).
- Implemented trusted role mapping from PostgreSQL `public.user_roles` table with fail-closed orphan account protection.
- Implemented auth lifecycle initialization (`initAuth`) and reactive state synchronization in `App.tsx`.
- Implemented Refactor Workstream W1 (T-020): strictly prohibited demo/mock mode in production in `config.ts` (CFG-01).
- Upgraded backend health reporting to distinctly evaluate 5 separate service components: configuration, gateway, auth, database, and storage (CFG-04).
- Isolated mock fixtures from backend mode in `App.tsx` (CFG-05).
- Implemented Refactor Workstream W2 (T-021): created additive Migration 00003 (`00003_complete_normalized_schema.sql`) defining 14 normalized tables with full RLS, explicit revokes, least-privilege authenticated policies, and security constraints (DB-03).
- Implemented typed persistence repositories (`ProfileRepository`, `FinanceRepository`, `CRMRepository`) in `frontend/src/lib/repositories.ts` with Supabase query integration and safe demo fallback (DB-01, DB-02).
- Fixed fact fabrication in `profileRowToDTO` and `profileDTOToRow`: preserved unknown/unspecified fields without manufacturing parents, 10-marla property, or Unsplash placeholder URLs (DB-04, DB-05, DB-06).
- Validated lossless round-trip DTO <-> Row translation preserving all nested sibling, property, and preference structures (DB-07).
- Verified with 110 frontend tests, 68 backend tests (178 total passing), `tsc --noEmit` clean, and production build passing in 4.20s.
- Implemented Refactor Workstream W3 (T-022): eliminated manufactured pre-populated defaults from `ProfileWizard.tsx` (religion, aqeedah, caste, height, parents, property, family notes, unsplash URL, consent) (PROF-02).
- Added explicit Representative Legal Consent Certification checkbox (OPEN-004) in `ProfileWizard.tsx` required before submission.
- Resolved OPEN-003 and recorded GMB-DEC-004 supporting authenticated customer self-service registration strictly in `pending_review` with `source: direct_web` (PROF-03).
- Updated `ProfileRepositoryImpl.create` to enforce `pending_review` and `direct_web` for self-service candidate registrations.
- Replaced hardcoded "Active & Verified" claims in `CustomerPortal.tsx` with true persisted status and localized status badge (PROF-06).
- Connected profile correction requests in `CustomerPortal.tsx` to durable CRM follow-up records via `crmRepository.create` for Nadeem's review (PROF-01).
- Implemented deterministic duplicate candidate detection engine (`frontend/src/lib/duplicateReview.ts`) with normalized phone, email, and demographic fingerprinting with localized English/Urdu match evidence (PROF-05).
- Added unit tests in `duplicateReview.test.ts` and updated `repositories.test.ts`. Verified with 116 frontend tests, 68 backend tests (184 total passing), `tsc --noEmit` clean, and production build passing in 3.64s.
