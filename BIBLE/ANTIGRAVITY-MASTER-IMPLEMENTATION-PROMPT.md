# Antigravity Master Implementation Prompt — Gulistan Marriage Bureau

**Document ID:** GMB-ANTIGRAVITY-MASTER-001  
**Version:** 1.0  
**Owner / final approver:** Nadeem (Product Owner)  
**Repository:** `Rao-Waleed-Nadeem/Gulistan-Marriage-Bureau`  
**Target branch:** `main`  
**Workflow:** Direct commits to `main`; do not create pull requests.

---

## Copy/paste instruction

You are the implementation agent for Gulistan Marriage Bureau. Work directly in the existing repository and follow this document as a task contract. Do not merely provide advice or a plan: inspect the repository, implement the authorized work, run checks, update the project records, and report evidence. Work in small, reviewable commits directly on `main`. Do not create branches or pull requests unless the Product Owner later explicitly changes this instruction.

### A. Mandatory reading — before editing anything

Read these repository documents in this order:

1. `BIBLE/STATIC-RULES.md` — permanent engineering, privacy, security and AI rules.
2. `SRS-Gulistan-Marriage-Buearu.txt` — approved product requirements.
3. `Overview-of-Project.txt` — project scope and operating context.
4. `Missing-or-Incorrect-Requirements.txt` — known defects and requirement gaps.
5. `Project-Roadmap.txt` — implementation and remediation sequence.
6. `MODULES/MODULE-01-AUTHENTICATION/01-AUTHENTICATION-REMEDIATION.md` — C-01 remediation requirements.
7. `MODULES/MODULE-01-AUTHENTICATION/02-SUPABASE-AUTH-INTEGRATION.md` — approved provider decision and integration scope.
8. `MODULES/MODULE-01-AUTHENTICATION/WORK-LOG.md` and `TEST-RESULTS.md` — work history and actual validation state.

If any named source file is unavailable in the workspace, say so and locate the corresponding attached/project file. Do not silently skip it, invent its contents, or replace project requirements with generic assumptions.

### B. Approved architecture decision

Supabase Auth is approved as the authentication provider for this project, subject to the constraints in the module specification.

The intended sign-in methods are:
- Bureau staff: email and password.
- Customers/families: email magic link (passwordless OTP link), with actual provider verification before a session is accepted.

This approval does **not** authorize inventing credentials, creating a production Supabase project, changing production settings, applying database migrations to a live database, or deploying the application.

### C. Direct-main Git workflow

1. Confirm the checked-out repository and branch. The target is `main`.
2. Do not create a pull request. Do not create a feature branch for this task.
3. Commit each coherent, validated task directly to `main` with a descriptive commit message.
4. Before each commit, inspect `git diff`, check for unrelated changes and secrets, and run the relevant tests.
5. Never overwrite another contributor's uncommitted changes. If the working tree is not clean, inspect and preserve them.
6. Do not force-push, rewrite history, reset, or delete user work.
7. If direct push to `main` is blocked by repository permissions or branch protection, stop and report the exact blocker. Do not work around protection or create a PR without approval.
8. Record each commit SHA and the exact files changed in the module work log.

### D. Work package 1 — C-01 demo-authentication removal

Verify and complete the fail-closed remediation already recorded in the repository:

- Remove all hardcoded demo passwords, demo identities, demo tokens and locally fabricated authenticated sessions.
- A typed email address alone must never establish a customer session.
- A magic link must only be reported as sent when the Supabase provider confirms dispatch; a session is accepted only after a verified callback/session event.
- Remove demo quick-fill controls and misleading success messages.
- Do not restore authentication identity from arbitrary localStorage/sessionStorage objects.
- Remove synthetic staff-session fallbacks from protected CRM, follow-up and finance actions.
- Keep sign-out and session-expiry behavior correct.
- Preserve unrelated application features and the existing visual language.
- Search the entire repository for other fake auth shortcuts, demo credentials, fabricated tokens, unsafe role fallbacks and bypasses. Record all findings; fix only those within the approved authentication scope.

### E. Work package 2 — Supabase Auth integration

Implement the provider integration described in `02-SUPABASE-AUTH-INTEGRATION.md`.

Core requirements:

1. Use the official `@supabase/supabase-js` client and a single typed client instance.
2. Use only the public Supabase project URL and publishable/anon key in browser configuration. Never expose a service-role key, database password, private key or secret in a `VITE_*` variable or frontend bundle.
3. Validate missing/placeholder/invalid configuration. Missing configuration must fail closed for authentication and protected operations; it must not fall back to a fake successful demo login.
4. Implement staff email/password authentication using Supabase Auth.
5. Implement customer/family magic-link sign-in using Supabase Auth OTP/magic-link flow, including a verified callback/session lifecycle. Do not claim a link was delivered unless the provider call succeeded.
6. Subscribe to the provider's auth-state changes and correctly handle initial session, sign-in, token refresh, expiry, sign-out and errors.
7. Do not manually manufacture JWTs, user IDs, roles, provider sessions or expiry values.
8. Map application roles from trusted server-managed data. Never trust user-editable `user_metadata`, browser state, URL parameters or a client-selected role to grant privileges.
9. Staff/admin role assignment must be performed through a trusted administrative process, not through a public signup form or client-side update.
10. Keep UI route guards as convenience only. Enforce authorization at trusted backend/database boundaries using reviewed Supabase Row Level Security (RLS) policies.
11. Do not create permissive RLS policies such as unrestricted `USING (true)` or `WITH CHECK (true)` for private customer data.
12. Do not allow customers to read other customers' profiles, contact details, family details, photographs, documents, or private match data.
13. Never log access tokens, magic-link tokens, passwords, personal profile information or private contact details.
14. Add tests for provider-unavailable, invalid credentials, magic-link dispatch errors, verified callback, session restoration, expiry, sign-out, role mapping and unauthorized access.
15. Keep English and Urdu authentication errors/messages consistent with the current app language.

Important policy boundary:
- Inspect the SRS and existing account/customer workflows to determine whether self-service registration is explicitly approved.
- Do not silently enable public account creation. If the requirements do not specify whether a new magic-link address may create an account, implement existing-account sign-in only where technically feasible and record the registration decision as an open Product Owner question. Do not invent an account approval workflow.
- Do not invent staff role assignment, customer onboarding, or identity-verification procedures. Document unresolved business decisions before implementing them.

### F. Environment and secrets

- Add/update `.env.example` with variable names and safe placeholders only.
- Never commit a real `.env`, access token, service-role key or credential.
- Do not ask the Product Owner to paste secrets into source code, prompts, chat logs or GitHub.
- If required Supabase project values are not available, complete all safe code/config/test work possible, leave provider integration explicitly marked as awaiting environment configuration, and list exactly which values must be entered locally by the owner.
- The browser may use the Supabase URL and public anon/publishable key only. Any privileged operation requiring service-role authority belongs on a trusted server and needs a separate security review.

### G. Database, RLS and migration safety

- Inspect the existing schema and migrations before proposing any change.
- Do not assume table names, profile columns, role enums or existing policies.
- Create versioned, reversible/reviewable migration files only after inspecting the actual schema.
- Make policies least-privilege and test them against anonymous, customer, matchmaker/staff and administrator identities.
- Never apply migrations to a production database, delete/alter production records, or change live Supabase Auth settings without explicit Product Owner approval.
- If schema/role design is unclear, produce a concise decision note and stop that specific database change rather than guessing.

### H. Required validation

Run the actual repository scripts from `frontend/` and record real output, exit codes and date:

- `npm run lint`
- `npm test`
- `npm run build`

Also run focused authentication tests and any RLS/integration tests added. Do not write “passed” unless the command ran successfully. If a command cannot run, record why and mark it “Not tested” or “Blocked”.

Perform a final source scan for:
- Old demo passwords and hardcoded credential strings.
- Demo/fake tokens and locally fabricated sessions.
- Direct writes of role values from client-controlled data.
- Authentication bypasses and fabricated staff sessions.
- Accidental secret exposure.
- Overly permissive RLS policies.
- Customer data exposed through public URLs, logs or unprotected queries.

### I. Required documentation updates

Keep these records accurate and synchronized with the implementation:

- `MODULES/MODULE-01-AUTHENTICATION/01-AUTHENTICATION-REMEDIATION.md`
- `MODULES/MODULE-01-AUTHENTICATION/02-SUPABASE-AUTH-INTEGRATION.md`
- `MODULES/MODULE-01-AUTHENTICATION/WORK-LOG.md`
- `MODULES/MODULE-01-AUTHENTICATION/TEST-RESULTS.md`
- `BIBLE/DECISION-REGISTER.md` (create if missing; record Supabase Auth approval and any open decisions)
- `BIBLE/CHANGELOG.md` (create if missing; record approved project changes)

Every work-log entry must contain:
- Date and task ID.
- Branch (`main`).
- Files inspected and changed.
- Summary of implementation.
- Commands run and actual results.
- Commit SHA(s).
- Open risks and decisions.
- Product Owner acceptance status.

Do not mark the module complete merely because code was written. Completion requires successful validation, real provider configuration/integration where applicable, security review, and Product Owner acceptance.

### J. Stop conditions — ask before proceeding

Stop and ask the Product Owner before:
- Changing business rules or user/customer onboarding policy.
- Enabling public signup or deciding who may create accounts.
- Assigning or changing staff/admin privileges.
- Changing privacy/disclosure/consent behavior.
- Applying a database migration to a live database.
- Creating/changing production Supabase settings, redirect allowlists, SMTP/email delivery or production secrets.
- Deploying, publishing or importing real customer data.
- Expanding beyond Module 01 authentication and its directly required authorization boundary.

### K. Final report format

At the end, report:
1. What was implemented (with exact file paths).
2. What was not implemented and why.
3. Test/build commands and actual pass/fail output.
4. Security findings and remaining risks.
5. Database migrations created (and explicitly whether they were applied).
6. Required owner configuration steps.
7. Commit SHA(s) on `main`.
8. Updated work-log and test-results links.
9. Open Product Owner decisions.
10. A clear status: Implemented / Partially implemented / Not implemented / Tested / Not tested / Awaiting approval.

Do not claim production readiness or module completion without evidence.
