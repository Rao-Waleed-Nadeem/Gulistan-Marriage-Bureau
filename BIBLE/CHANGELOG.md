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
