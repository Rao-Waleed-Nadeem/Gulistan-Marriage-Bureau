# Module 01 — Authentication and Session Integrity

**Module ID:** GMB-M01  
**Task ID:** GMB-C01  
**Priority:** P0 — Critical  
**Defect reference:** C-01  
**Status:** Remediation in progress; Product Owner acceptance pending  
**Repository branch:** `fix/c-01-disable-demo-auth`

## 1. Objective

Replace the repository's simulated authentication behavior with a fail-closed boundary. Until a real authentication provider is provisioned and integrated, the application must not grant a staff or customer session, generate a trusted client token, or claim that a magic link was sent or verified.

This module first removes unsafe behavior. It does not claim to deliver working production authentication.

## 2. Evidence from the audited repository

Files inspected on the default branch:

- `frontend/src/lib/auth.ts`
- `frontend/src/components/auth/AuthModal.tsx`
- `frontend/src/lib/auth.test.ts`
- `frontend/src/lib/config.ts`
- `frontend/src/App.tsx`
- `frontend/src/lib/followUps.ts`
- `frontend/src/lib/finance.ts`

Observed defects:

1. Staff email/password sign-in accepted hardcoded demo credentials.
2. The client constructed user IDs, demo tokens, roles and expiry timestamps.
3. Customer magic-link flow immediately created a customer session without sending or verifying a link.
4. Demo quick-fill shortcuts were visible in the authentication modal.
5. The authentication UI could display a successful customer sign-in despite no external verification.
6. Application code contained fallback synthetic staff sessions for protected CRM and finance operations.
7. Existing authentication tests asserted that demo staff credentials and unverified customer magic links should succeed.

## 3. Scope of this module

### In scope

- Disable all hardcoded demo staff credential success paths.
- Disable customer sign-in that does not follow a real send-and-verify flow.
- Remove demo quick-fill controls and fabricated success messaging from the login UI.
- Remove locally fabricated session creation from sign-in functions.
- Stop treating browser session storage as proof of identity and clear legacy demo session data.
- Ensure unavailable authentication fails closed with a clear bilingual error.
- Remove synthetic staff-session fallback from protected follow-up and finance actions in the application shell.
- Update unit tests so they assert that unconfigured authentication cannot create a session.
- Document the remaining provider integration work and test status.

### Out of scope

- Selecting or provisioning Supabase or another identity provider.
- Creating production user accounts.
- Configuring email delivery, SMTP, redirect URLs or magic-link templates.
- Implementing password reset, MFA, session refresh or provider callback handling.
- Implementing backend role tables, RLS policies or server-side authorization.
- Claiming the application is production secure or ready for real customer data.
- Refactoring unrelated profile, matching, finance or CRM modules.

## 4. Required behavior

1. Missing provider configuration must never fall back to successful demo authentication.
2. Staff sign-in must not succeed unless a real provider verifies the credentials.
3. Customer magic-link sign-in must not succeed until a real provider sends the link and verifies the callback/token.
4. An email address alone is not proof of identity.
5. No browser-generated token or locally selected role may establish authentication.
6. Legacy demo session data must not restore a protected session.
7. Sign-out must return the application to unauthenticated public state.
8. UI permission checks must not be represented as backend authorization.
9. Protected actions must not manufacture a staff session when the current session is missing or invalid.
10. Error and loading states must not claim a successful login or message delivery when no provider operation occurred.

## 5. Permitted implementation files

Initial implementation branch changes:

- `frontend/src/lib/auth.ts`
- `frontend/src/components/auth/AuthModal.tsx`
- `frontend/src/App.tsx`
- `frontend/src/lib/auth.test.ts`

Any additional file change requires a documented reason and must remain within this module's authentication boundary.

## 6. Acceptance criteria

- [ ] Former hardcoded staff credentials no longer authenticate.
- [ ] Former demo email-pattern shortcuts no longer authenticate.
- [ ] A valid-looking customer email does not create a customer session without provider verification.
- [ ] No demo token or user identity is created by sign-in code.
- [ ] Login modal contains no demo quick-fill shortcuts.
- [ ] UI never reports magic-link delivery or verification unless a provider confirms it.
- [ ] Old demo session data is not restored as authenticated state.
- [ ] Missing/invalid/expired session denies protected navigation.
- [ ] Protected CRM and finance actions do not construct synthetic staff sessions.
- [ ] Unit tests cover the fail-closed behavior.
- [ ] Type check, tests and production build are executed successfully.
- [ ] A reviewer verifies the diff and confirms no unrelated changes.
- [ ] Product Owner accepts the module before merge.

## 7. Test plan

1. Test missing credentials and malformed email.
2. Test former demo staff credentials and pattern-based aliases.
3. Test valid customer email without a provider.
4. Test no session is created on any failed/unavailable provider operation.
5. Test expired, missing, tokenless and role-inconsistent sessions.
6. Test customer/staff/admin client navigation boundaries.
7. Test legacy session cleanup.
8. Test sign-out and auth listener behavior.
9. Run the frontend type check.
10. Run the complete frontend unit test command.
11. Run the production build.
12. Inspect the branch diff for unrelated changes and leaked credentials.

## 8. Current implementation notes

The remediation branch currently contains these changes:

- `auth.ts`: removed demo credential authentication and simulated magic-link session creation; sign-in currently fails with `AUTH_PROVIDER_NOT_CONFIGURED`; legacy session storage is cleared and is no longer read as identity.
- `AuthModal.tsx`: removed demo quick-fill buttons and false success notice; added a bilingual explanation that verified sign-in is not configured.
- `App.tsx`: removed synthetic staff-session fallbacks for follow-up completion and finance recording.
- `auth.test.ts`: replaced tests that expected demo sign-in success with tests for fail-closed behavior.

These are code changes, not yet proof that the application builds or that the complete system is secure.

## 9. Known remaining work

- Real identity provider selection and provisioning.
- Verified staff password authentication.
- Verified customer magic-link send and callback.
- Trusted role mapping and server-side authorization.
- Secure provider session lifecycle, refresh, expiry and revocation.
- Account recovery and administrative MFA decision.
- Real integration and end-to-end tests against a configured staging environment.
- Review of all other code paths for any remaining synthetic session or role assumptions.

## 10. Status

**Current status:** Remediation code committed to a feature branch; automated validation and Product Owner acceptance are still pending.

Do not merge this branch or use it with real customer data until the acceptance evidence is complete.
