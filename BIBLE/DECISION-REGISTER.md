# Decision Register — Gulistan Marriage Bureau

| Decision ID | Date | Decision | Status | Notes |
|---|---|---|---|---|
| GMB-DEC-001 | 2026-11-13 | Use Supabase Auth as the project's identity provider. | Approved | Staff use email/password; customers/families use verified email magic links. This does not approve production provisioning or public signup. |
| GMB-DEC-002 | 2026-11-13 | Work directly on the GitHub `main` branch; do not create pull requests. | Approved | Product Owner instruction. Do not bypass branch protection or force-push. If direct push is blocked, stop and report. |
| GMB-DEC-003 | 2026-11-13 | Disable all simulated/demo authentication until real provider verification is integrated. | Approved | C-01 fail-closed remediation. |

## Open decisions — do not assume

1. Whether customer magic-link flow may create a new Auth user or must be restricted to existing/provisioned accounts.
2. Customer onboarding/approval workflow for self-service registration.
3. Trusted role schema and staff/admin provisioning process, after inspecting the existing database schema.
4. Supabase project environment, redirect URLs, email delivery/SMTP and staging configuration.
5. Whether MFA is required for administrator/staff accounts.

Each open decision requires Product Owner approval before implementation changes that depend on it.
