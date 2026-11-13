# Gulistan Marriage Bureau — Refactoring Programme

Status: Source-grounded implementation plan. No application code changed in this documentation pass.
Baseline: GitHub main, commit 42bb897d81a80f4a907d958d556f487d835b2102, 2026-11-13.

## Start here
1. 01-COMPREHENSIVE-AUDIT.md — findings, severity, source paths, contradictions and evidence status.
2. 02-IMPLEMENTATION-BLUEPRINT.md — target boundaries, workstreams, sequencing, data integrity and compatibility rules.
3. 03-ACCEPTANCE-AND-RELEASE-GATES.md — measurable completion evidence.
4. 04-OWNER-ACTIONS-AND-ENVIRONMENT.md — tasks Antigravity cannot complete without the owner/provider account.
5. UNIVERSAL-AGENT-PROMPT.md — reusable one-task-per-run instruction.

## Governing sources
This programme supplements, and does not replace or silently rewrite, root AGENTS.md, root agent-prompt.md, backend/AGENT_TASK_QUEUE.md, backend/docs/01 through 15, backend/docs/09-open-decisions.md, backend/docs/10-frontend-domain-inventory.md, backend/docs/11-owner-decision-sheet.md, the SRS and project source documents.

Use the authority order in backend/docs/README.md. Current owner-approved requirements supersede older conflicting statements, but must be recorded in the decision register and reconciled across affected documents before implementation is marked DONE.

## Non-negotiable invariants
- Preserve the existing React/Vite/TypeScript/Tailwind application, routes, product behavior, design language and source field meanings. Refactor incrementally; do not rebuild without a documented necessity.
- 100,000+ means 100,000+ currently active profiles.
- Customer access supports both assisted and self-service paths. Self-service onboarding must be controlled and reviewed; older concierge-only language is not the sole model.
- External matchmaker financial arrangements vary by matchmaker.
- Existing source material is mostly WhatsApp and phone-gallery content; migration is staged, consent-led and auditable.
- Android is the primary device; Urdu RTL and English LTR are first-class.
- Nadeem reviews and approves every match suggestion before disclosure.
- Only explicitly approved profile details may be disclosed. Consent is purpose-specific, withdrawable and enforced by trusted backend code.
- Never fabricate profile facts, verification, consent, finance entries, benchmark results or security test results.
- No secrets in source control, prompts, browser bundles or logs.
- Work directly on main; no PRs, branches, force-push or history rewrite. Stop if safe direct commit is blocked.
- Production provisioning, credentials, real-data migration, irreversible deletion, billing and deployment require owner authorization.

## Completion meaning
A build or unit-test pass does not make the application ready. Completion requires P0/P1 workstreams, live staging integration and security tests, real 100k-active-profile database evidence, owner acceptance, operational backup/restore evidence, Android and bilingual validation, and a release decision.

Evidence labels: Observed in source; Documented claim; Verified live; Owner action; Open decision. Never treat a documented claim as live verification.
