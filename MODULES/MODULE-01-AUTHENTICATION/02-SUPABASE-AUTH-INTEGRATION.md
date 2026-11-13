# Module 01 — Supabase Auth Integration Specification

**Module:** GMB-M01  
**Task:** GMB-AUTH-02  
**Status:** Approved provider choice; implementation pending  
**Provider:** Supabase Auth  
**Target branch:** `main`  
**Owner:** Nadeem (Product Owner)

## 1. Approved decision

Use Supabase Auth as the identity provider.

- Staff sign in with email and password.
- Customers/families sign in using a verified email magic link (OTP link).
- Application roles must come from trusted, server-managed authorization data.
- Frontend route guards are not security controls.
- Supabase database RLS and trusted backend checks must protect private operations and data.

This decision approves the provider choice, not production provisioning, public signup policy, email delivery configuration, or live database changes.

## 2. Pre-existing C-01 work

The initial C-01 remediation disables fabricated login paths and keeps sign-in unavailable until real provider integration is complete. Preserve the fail-closed behavior until the Supabase integration is actually configured and verified.

Do not reintroduce demo credentials or mock authenticated sessions to make the UI appear functional.

## 3. Technical integration requirements

1. Use the official `@supabase/supabase-js` package.
2. Create one typed Supabase client instance and one authentication adapter/service boundary.
3. Read only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (or the currently supported public publishable key) in browser code.
4. Never expose `SUPABASE_SERVICE_ROLE_KEY`, database connection strings, private keys or secrets to the frontend.
5. Validate the URL and public key; empty or placeholder configuration must produce an explicit unavailable state, not fake authentication or a false backend-health success.
6. Implement staff email/password sign-in using the provider's password method.
7. Implement family/customer magic-link sign-in with provider-confirmed send result and a verified callback/session event.
8. Implement provider auth-state subscription, session restore, token refresh, expiry, sign-out and cleanup.
9. Avoid manual JWT creation or parsing as an authorization source. Use provider-verified user/session information and trusted role lookup.
10. Map roles only from server-controlled data. User-editable metadata, query parameters, local storage and frontend state must never grant roles.
11. Ensure account/session errors are safely presented in English and Urdu.
12. Never log credentials, OTPs, access/refresh tokens or customer personal data.

## 4. Account creation policy is unresolved unless the SRS explicitly answers it

Inspect the SRS and existing assisted/self-service workflows.

Do not enable public signup just because Supabase OTP can create users. If it is not explicitly approved, keep customer magic-link access restricted to existing/provisioned accounts and record the account creation/approval flow as an open decision for Nadeem.

Staff accounts must be provisioned through a trusted administrative process. Never expose a public staff registration route.

## 5. Authorization and RLS

Before adding migrations, inspect all existing migrations, schema, profile tables, roles and policies.

- Determine where trusted application roles are stored.
- Prevent customers from changing their own role or privilege fields.
- Restrict customer reads to their own authorized records.
- Restrict staff access according to approved role permissions.
- Keep private photographs, documents, phone numbers, family details and match data private by default.
- Do not add permissive catch-all policies.
- Create migration files and automated policy tests where the schema is understood.
- Do not apply any migration to a live database without explicit approval.

If role schema or access policy is unclear, document the exact decision required and stop that migration rather than inventing schema or access rights.

## 6. Redirects and email delivery

- Inspect current app routing and deployment environments before selecting callback URLs.
- Document local, staging and production redirect requirements separately.
- Do not change production redirect allowlists, SMTP or email templates without approval.
- Report when the provider call succeeds or fails accurately; never display “link sent” before success.
- Handle expired, reused, malformed and invalid callback links safely.

## 7. Tests

Add and run tests for:
- Missing/invalid provider config.
- Password sign-in success and failure with mocked provider adapter.
- Magic-link dispatch success and failure.
- No session before verified callback.
- Verified callback and provider auth-state event.
- Session restoration, refresh and expiry.
- Sign-out and subscriber cleanup.
- Unknown role and missing role record.
- Customer cannot access another customer's record.
- Staff/admin access boundaries as defined by approved policies.
- No service-role key or secret included in browser bundle.

Distinguish unit tests using a mocked provider from integration tests against an actual staging Supabase project.

## 8. Acceptance criteria

- [ ] Supabase Auth client is initialized safely from public config.
- [ ] Staff email/password flow uses actual Supabase Auth.
- [ ] Customer magic-link flow uses actual provider send and verification.
- [ ] No client-generated identity, token or role is accepted.
- [ ] Session lifecycle follows provider events.
- [ ] Role mapping uses trusted server-managed data.
- [ ] Backend/database authorization is enforced with reviewed RLS.
- [ ] Customer data is private by default.
- [ ] Secrets are not committed or exposed to the browser.
- [ ] Tests, type check and build run successfully.
- [ ] Staging integration is verified where configuration is available.
- [ ] Work log and test results include actual evidence.
- [ ] Nadeem accepts the result.

## 9. Current known environment limitation

No Supabase project URL, public key, service-side configuration, email provider setup, or production credentials are assumed to be available in source control. Do not invent them. Complete code and test work that can be safely completed without secrets, then report the exact owner-side configuration needed.
