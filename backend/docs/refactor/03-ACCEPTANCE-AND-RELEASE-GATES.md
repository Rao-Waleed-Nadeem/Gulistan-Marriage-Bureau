# 3. Acceptance, Test and Release Gates

## 3.1 Evidence levels

| Level | Meaning | Sufficient for production readiness? |
|---|---|---|
| Unit | Pure function/component tests with synthetic fixtures | No |
| Contract | API/DTO/schema shape tests | No |
| Local integration | Local DB/emulator or mocked provider | No |
| Staging integration | Real isolated Supabase project and test identities | Not alone |
| Live security | Actual RLS/Storage/Edge Function negative tests | Required |
| Capacity | Real database benchmark with target dataset/concurrency | Required |
| Owner acceptance | Product owner confirms workflows/decisions | Required |
| Production operation | Approved deployment, monitoring and recovery evidence | Required |

A test name, report, migration file, simulated response or old completion note is not proof of a live system.

## 3.2 P0 gates

### GATE A — Identity and authorization
- [ ] Staff email/password sign-in and customer/family verified magic-link sign-in work with Supabase Auth.
- [ ] Session initializes, refreshes, expires and signs out correctly.
- [ ] Disabled/pending accounts cannot access business data.
- [ ] Trusted role assignment cannot be changed by browser/user metadata.
- [ ] Product Nadeem ↔ DB matchmaker mapping is consistent.
- [ ] Anonymous/customer cannot access staff-only CRM, finance, audit or private fields.
- [ ] Forged local persona, altered API payload, guessed UUID and direct REST requests are denied.
- [ ] Revocation/cross-tab sign-out tested in staging.
- [ ] Staff MFA decision recorded and implemented if required.

### GATE B — Configuration
- [ ] Separate dev/staging/prod projects and values.
- [ ] Missing/invalid production config fails startup/deployment.
- [ ] Production rejects demo/mock mode.
- [ ] Service-role key only in server secret store; absent from source, Vite bundle and logs.
- [ ] Health distinguishes configuration, gateway, auth, DB and Storage.
- [ ] CI secret/dependency checks pass.

### GATE C — Data and consent
- [ ] No fact-like defaults for religion, aqeedah, caste, parent status, property, income, preferences, height or verification.
- [ ] Unknown/not-collected/not-disclosed/not-applicable survives round-trip.
- [ ] Consent absent/false until explicit affirmative action; purpose-specific grant/withdraw history persists.
- [ ] Status transitions enforced server-side and recorded.
- [ ] UUID and human reference code remain distinct.
- [ ] Sibling/property/preference data persists without loss.
- [ ] Mock profiles never appear in production.

### GATE D — Privacy and storage
- [ ] Private bucket denies public access.
- [ ] Storage object policies enforce role/profile/consent.
- [ ] Upload metadata and consent persist.
- [ ] Token uses cryptographic entropy; only hash stored.
- [ ] Grants expire and revoke immediately; redemption rechecks policy.
- [ ] Disclosure snapshot contains only explicitly approved fields.
- [ ] Consent withdrawal blocks access and purges photos.
- [ ] Logs contain no raw token, signed URL, phone, sensitive profile or message body.

### GATE E — Finance
- [ ] Formula everywhere: Net Balance = Total Receivable - Total Payable.
- [ ] Sign meaning proven with examples and UI labels.
- [ ] Owner/accountant approves true double-entry or partner sub-ledger model.
- [ ] Transactions persistent, append-only and idempotent.
- [ ] Settlement/reversal atomic and traceable.
- [ ] Reconciliation computed from persisted postings; mismatch fails.
- [ ] Currency/precision and partner-specific agreement terms enforced.

## 3.3 P1 functional gates

### GATE F — Customer/staff workflows
- [ ] Assisted profile intake works end-to-end.
- [ ] Self-service intake creates pending review and cannot bypass verification/approval.
- [ ] Customer sees only own authorized data.
- [ ] Correction request is persisted and reviewed, not simulated.
- [ ] Nadeem can review/approve lifecycle transitions with audit.
- [ ] External matchmaker and varying agreement terms persist.
- [ ] CRM follow-up create/assign/complete/overdue persists.
- [ ] Regional unit conventions save/load from backend.

### GATE G — Matching and introductions
- [ ] Deterministic matching works without paid AI.
- [ ] Only explicitly classified criteria are mandatory/preferred.
- [ ] Unknown values do not silently match.
- [ ] Evaluation stores algorithm/config version and criterion explanations.
- [ ] Nadeem approval required before every suggestion is shared.
- [ ] Status/consent/eligibility rechecked before share.
- [ ] Customer sees only own data and approved recommendations.
- [ ] WhatsApp draft matches approved snapshot; no false sent/delivered/read claim.
- [ ] AI does not process PII until OPEN-015 approved and cannot approve/share.

### GATE H — Import and scale
- [ ] 100,000+ active synthetic profiles in staging database, not just in-memory.
- [ ] Server-side pagination/filtering; no full registry browser download.
- [ ] Query plans/indexes reviewed.
- [ ] p50/p95/p99 measured under expected concurrency.
- [ ] Import has provenance, consent, dedupe, quarantine, dry-run and reconciliation.
- [ ] Batch rollback/correction documented and tested.
- [ ] No sensitive offline browser cache.

## 3.4 P2 quality and operations
- [ ] CI runs lint/typecheck, frontend/backend tests, build, migration validation and secret scan.
- [ ] Reproducible staging deployment linked to commit SHA.
- [ ] Real backup/PITR restore in isolated target.
- [ ] Retention/deletion verified, including no photo resurrection after restore.
- [ ] Monitoring/alerts and incident response tested.
- [ ] Android-first device/browser coverage complete.
- [ ] Urdu RTL and English LTR tested with mixed phones, IDs, dates and long text.
- [ ] Accessibility keyboard/focus/contrast/labels/touch/screen reader checks pass.
- [ ] Theme review documents Gulistan Heritage, Modern Trust and Warm Elegance without unapproved redesign.

## 3.5 Definition of DONE per task
1. Scope and acceptance criteria satisfied.
2. Relevant source/tests updated.
3. Actual commands/results recorded.
4. No secrets, PII or fixture leakage.
5. Docs and task queue updated.
6. Commit is on main and remote SHA verified.
7. External prerequisites completed or clearly BLOCKED.
8. No unrelated behavior or SRS meaning changed.

## 3.6 Final release decision
Existing backend/docs/14-release-readiness-review.md contains historical completion claims; do not treat it as current release authorization. Add a dated evidence addendum after workstreams finish. Application remains NOT RELEASE-READY until P0/P1 and required P2 gates are evidenced and owner acceptance recorded.
