# 8. AI Agent Operating Contract

This document is a binding working contract for any coding agent working on Gulistan Marriage Bureau.

## 8.1 Mandatory first steps

Before coding:
1. Read `docs/README.md` and the relevant linked specifications.
2. Inspect the current repository state and the exact files to be changed.
3. Confirm the real stack from package/config files; do not assume it.
4. Identify whether the task changes schema, RLS, consent, private photos, matching, sharing, finance, authentication or deployment.
5. Write a short implementation plan with files, migration impact, tests and risks.
6. If a critical business rule is OPEN in `docs/09-open-decisions.md`, do not invent it. Implement only noncontroversial scaffolding or ask for clarification.

## 8.2 Preserve existing work

- Do not migrate Vite to Next.js.
- Do not replace React, Tailwind, the translation system, design tokens or the scroll animation as part of backend tasks.
- Do not delete or mass-reformat unrelated files.
- Do not remove mock data until the corresponding feature has a tested backend replacement and demo/test fixtures remain available.
- Do not commit or stage unrelated changes.
- Do not overwrite another agent's changes without inspecting the diff.
- Do not rewrite Git history or force-push.
- Never claim tests passed unless they were actually run and their output was inspected.

## 8.3 Security rules

- Treat all browser input as untrusted.
- Never put service-role keys or private third-party keys in frontend code or `VITE_*` variables.
- Never use client role state as authorization.
- Never expose all profile columns where the UI needs only a subset.
- Never make private profile photos publicly accessible.
- Never log full profiles, phone numbers, photo URLs, tokens or message contents.
- Never use real customer data in fixtures, tests or AI prompts unless an explicitly reviewed data-processing policy permits it.
- Never allow AI to authorize, approve, share, change roles or write financial records without a separately approved, deterministic trusted workflow.
- Add negative tests for every authorization rule.
- Do not weaken RLS or tests to make a failing feature pass.

## 8.4 Database and migration rules

- Use SQL migrations as the schema source of truth.
- Enable RLS on browser-exposed tables and add explicit grants/policies.
- Use constraints and foreign keys for invariants where appropriate.
- Keep financial records traceable and auditable.
- Use idempotency protection for retryable writes.
- Do not seed production with mock profiles.
- For destructive migrations, stop and request owner approval unless a documented approved migration plan already exists.

## 8.5 Coding standards

- TypeScript strictness should be preserved; avoid `any` when a domain type or validated unknown is possible.
- Validate at trust boundaries, not only in form components.
- Keep feature logic in small modules; avoid a giant `App.tsx` or universal backend service.
- Keep English and Urdu strings in translation dictionaries.
- Provide accessible loading, empty, error and permission-denied states.
- Prefer clear code and standard platform features over clever abstractions.
- Add comments explaining non-obvious security invariants, not narrating obvious syntax.
- Update documentation when behavior, schema or configuration changes.

## 8.6 Required completion report

For every task, report:
- What changed and why.
- Files added/changed.
- Migration and RLS impact.
- Tests/build/type checks actually run and results.
- Security/privacy implications.
- Any unresolved decision or known limitation.
- Manual steps required from the owner.

## 8.7 Definition of done

A task is not done merely because the UI compiles. It is done only when its acceptance criteria are met, backend authorization is tested, migrations are reproducible, failure states are handled, no secrets/private data leak, and relevant documentation is updated.
