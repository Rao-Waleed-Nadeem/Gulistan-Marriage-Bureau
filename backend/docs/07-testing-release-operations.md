# 7. Testing, Release and Operations

## 7.1 Required quality gates

Before merging a backend or frontend integration change:
- TypeScript check passes.
- Lint check passes (the current `npm run lint` script runs `tsc --noEmit`; do not assume it runs ESLint).
- Production build passes.
- Unit tests cover changed business logic.
- Database migrations apply from a clean development database.
- RLS tests include both allow and deny cases.
- Edge Functions are tested for authenticated, unauthenticated, unauthorized, malformed and replayed requests as applicable.
- Urdu/RTL and English/LTR flows are checked.
- No secrets, real profile data, or private database dumps are in the diff.
- Documentation and environment examples are updated.

## 7.2 Test layers

### Unit
Pure calculations and validation: units, money formatting, ledger balance, matching criteria classification, disclosure field allowlists, status transitions and localization helpers.

### Integration
Real local/test database with migrations, constraints, foreign keys, RLS, grants, storage policies and Edge Functions. Test using separate identities/roles rather than only service-role clients.

### End-to-end
Browser workflows: login/logout, profile submission, pending review, staff approval, search, match review, controlled sharing preview, revoked/expired links, follow-up completion and finance workflows.

### Security regression
At minimum, exercise all threats in document 03. A successful happy path is not sufficient evidence of authorization.

### Capacity
Generate at least 100,000 synthetic profiles and representative sibling/preferences/photo metadata. Benchmark common search filters, matching candidate selection, pagination and indexes. Record dataset size, provider tier, query plans and observed latency; do not promise a performance number until measured.

## 7.3 Migrations

- Every schema/policy change is a SQL migration committed to version control.
- Never edit production schema manually without recording the change in a migration and reconciling environments.
- Test forward migration from the previous schema.
- For destructive changes, document backup, compatibility, rollback/recovery and data conversion before execution.
- Prefer expand-migrate-contract for changes that must coexist with deployed frontend versions.
- Do not run production migrations from an unreviewed AI-agent branch.

## 7.4 Environments and secrets

- Separate development and production projects; staging is required before a broad pilot.
- Use synthetic data in development/test.
- Keep actual secret files out of Git. Commit only placeholders and descriptions in `.env.example`.
- Browser-exposed Vite variables must contain only public values.
- Restrict database/admin credentials and rotate them if exposed.
- Never paste secrets into prompts, issues, screenshots, logs or documentation.
- Confirm the provider's data region, contractual terms, plan limits and backup behavior before real data is stored.

## 7.5 Backup and recovery

Before production:
- Define database backup/export frequency and retention.
- Define photo/object-storage backup strategy separately from database backups.
- Define who can restore and who approves restoration.
- Run a restore drill in a non-production environment.
- Measure recovery point objective (acceptable data loss) and recovery time objective (acceptable downtime) with the owner.
- Document how consent withdrawal/deletion interacts with backups and legal retention.
- Keep encrypted exports in a restricted location and never commit them.

A backup that has not been restored and verified is not a proven recovery plan.

## 7.6 Release process

1. Work on a feature branch.
2. Read this documentation and the relevant frontend modules.
3. Implement one bounded task.
4. Add/update tests and migration(s).
5. Run quality gates and inspect the complete diff.
6. Confirm no unrelated visual/animation changes.
7. Open a pull request with summary, test evidence, migration notes, security impact and unresolved decisions.
8. Require human review for schema, authorization, consent, sharing, finance and production deployment changes.
9. Merge only after required checks and review pass.
10. Deploy to staging, run smoke/security checks, then seek explicit owner approval before production.

## 7.7 Monitoring and incidents

Production plan should cover availability/error monitoring, database/storage usage and quota alerts, failed login patterns, unexpected exports, Edge Function errors and backup failures. Avoid telemetry that collects profile contents. Establish an incident response contact/process before a public launch.
