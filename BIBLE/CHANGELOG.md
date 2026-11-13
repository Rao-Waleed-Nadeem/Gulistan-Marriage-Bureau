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
- Verified with 102 frontend tests, 62 backend tests (164 total passing), `tsc --noEmit` clean, and production build passing in 3.25s.
