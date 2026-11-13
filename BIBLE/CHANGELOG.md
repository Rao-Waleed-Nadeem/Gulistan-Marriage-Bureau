# Project Changelog

## 2026-11-13

- Transferred C-01 fail-closed authentication remediation and associated project records directly to GitHub `main`.
- Added permanent project static rules and Antigravity implementation instructions.
- Recorded approval of Supabase Auth as the authentication provider.
- Specified staff email/password and customer/family verified magic-link authentication.
- Recorded direct commits to `main` as the repository workflow; pull requests are not to be created unless the Product Owner changes the instruction.
- Implemented Module 01: Supabase Auth integration using `@supabase/supabase-js`.
- Implemented staff email/password authentication with bilingual error handling.
- Implemented customer/family magic-link authentication with `shouldCreateUser: false` (prohibiting unapproved public signup).
- Implemented trusted role mapping from PostgreSQL `public.user_roles` table with fail-closed orphan account protection.
- Implemented auth lifecycle initialization (`initAuth`) and reactive state synchronization.
- Verified C-01 fail-closed authentication removal across all test suites (98 frontend tests, 62 backend tests, 160 total passing).
- Validated TypeScript type check (`tsc --noEmit`, 0 errors) and production build (`vite build`, 4.36s).
