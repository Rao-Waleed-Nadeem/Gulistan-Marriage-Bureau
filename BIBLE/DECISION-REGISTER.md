# Decision Register — Gulistan Marriage Bureau

| Decision ID | Date | Decision | Status | Notes |
|---|---|---|---|---|
| GMB-DEC-001 | 2026-11-13 | Use Supabase Auth as the project's identity provider. | Approved | Staff use email/password; customers/families use verified email magic links. This does not approve production provisioning or public signup. |
| GMB-DEC-002 | 2026-11-13 | Work directly on the GitHub `main` branch; do not create pull requests. | Approved | Product Owner instruction. Do not bypass branch protection or force-push. If direct push is blocked, stop and report. |
| GMB-DEC-003 | 2026-11-13 | Disable all simulated/demo authentication until real provider verification is integrated. | Approved | C-01 fail-closed remediation. |
| GMB-DEC-004 | 2026-11-13 | Assisted & Self-Service Intake Workflow: Support assisted staff intake and self-service registration. Self-service intake strictly creates records in `pending_review` with `source: direct_web` and cannot bypass Nadeem verification/approval. | Approved | Resolves PROF-03 and clarifies OPEN-003. |
| GMB-DEC-005 | 2026-11-14 | Matchmaker Finance Accounting Model & Semantics: Matrimonial partner clearinghouse sub-ledger with double-entry bureau conventions. Formula: Net Balance = Total Pending Receivable - Total Pending Payable. Sign semantics: positive = net asset (partner owes bureau), negative = net liability (bureau owes partner), zero = settled. Immutable append-only ledger with traceable reversals referencing original transaction. Computed reconciliation with mismatch detection. | Approved | Resolves OPEN-010, FIN-01, FIN-02, and FIN-05. |

## Open decisions — do not assume

1. Whether customer magic-link flow may create a new Auth user or must be restricted to existing/provisioned accounts.
2. Customer onboarding/approval workflow for self-service registration.
3. Trusted role schema and staff/admin provisioning process, after inspecting the existing database schema.
4. Supabase project environment, redirect URLs, email delivery/SMTP and staging configuration.
5. Whether MFA is required for administrator/staff accounts.

Each open decision requires Product Owner approval before implementation changes that depend on it.
