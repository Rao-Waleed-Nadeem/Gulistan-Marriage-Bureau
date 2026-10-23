# Instructions for AI Coding Agents

Read this file before making any change. The owner expects small, detailed, verifiable tasks. The agent implements; it must not invent product decisions.

## Start every run

1. Read `AGENTS.md`, `agent-prompt.md`, and `backend/AGENT_TASK_QUEUE.md`.
2. Read `backend/docs/README.md` and task-relevant specifications.
3. Inspect the current repository, actual source/configuration, Git status, and latest `main` commit.
4. Select the first `READY` task whose dependencies are `DONE`. Resume any `IN PROGRESS` task before starting another.
5. Plan briefly: objective, paths, acceptance criteria, tests, risks and decisions.
6. Execute exactly one task per run. Verify, update documentation and the queue, commit directly to `main`, verify the remote result, then stop and report.

## Repository rules

- Repository: `Rao-Waleed-Nadeem/Gulistan-Marriage-Bureau`.
- The owner explicitly requests direct commits to `main`. Do not create branches or pull requests.
- Never force-push, rewrite history, reset away changes, or overwrite a newer commit. If a safe direct update is blocked, stop and report the exact blocker.
- Use a focused conventional commit message. Verify the resulting commit and paths on `main`.
- Never claim a push, test, build, migration, provider connection or deployment succeeded unless it was actually performed and verified.
- Preserve unrelated and uncommitted work.

## Project architecture

- `frontend/` is the existing app. Preserve its design, React/Vite architecture, Urdu/English behavior, responsive/accessibility behavior and 300-frame scroll animation unless an explicitly scoped task says otherwise.
- The documented frontend baseline is React + Vite + TypeScript + Tailwind CSS v4. Inspect actual package/config files before relying on versions.
- Current UI/local role switching and mock records are prototype behavior, not authentication, authorization, or production data.
- `backend/` is the sibling workspace for backend implementation, migrations, server-side functions, backend tests and backend-specific configuration.
- Supabase PostgreSQL/Auth/private Storage is PROPOSED, not already provisioned or production-ready. Validate provider account, region, plan, limits, recovery and owner decisions before using real data or credentials.
- SQL migrations are the intended schema source of truth after the provider is approved.
- Docker is optional for reproducible builds/tests; not required for daily development. Do not self-host production PostgreSQL in Docker at this stage.
- Core search/matching must work without paid AI. AI must never independently authorize, approve, disclose, change roles or write financial records.

## Decisions and privacy

Follow the authority order in `backend/docs/README.md`: explicit owner decisions, approved documentation, SRS, current source as UI/domain evidence, older README/prompts, then assumptions.

Do not invent decisions about identity, consent, visibility, authentication, matching, lifecycle, retention/deletion, finance, legal obligations, hosting or AI processing. If a critical OPEN decision blocks a task, mark it BLOCKED, record the exact question/options in `backend/docs/09-open-decisions.md`, update the queue, and stop unless an independent READY task is explicitly available.

- Default to deny and least privilege.
- Validate untrusted input at backend/API boundaries.
- Never expose service-role keys, private keys, tokens or secrets in frontend code, `VITE_*` variables, committed files, logs or prompts.
- Keep profiles, contact details, family/religion/caste data and photographs private.
- Use synthetic fixtures only; never use customer data in tests/prompts.
- Do not log full profiles, phone numbers, photo URLs, tokens or message bodies.
- Add negative authorization/privacy tests. Never weaken RLS or tests just to pass.
- Use constraints, foreign keys, transactions and idempotency where appropriate.
- Avoid `any`; keep domain logic modular and user-facing English/Urdu text localized.
- Do not remove mock fixtures until the tested backend replacement exists and fixtures remain available for demo/tests.
- Destructive migrations, real customer data operations, production deployment, sending messages, billing changes and credential creation/rotation require explicit owner authorization.

## Documentation and reporting

When behavior, schema, APIs, permissions, configuration, tests or operations change, update the relevant docs in `backend/docs/` in the same task. Keep `backend/AGENT_TASK_QUEUE.md` accurate:
- DONE only after acceptance criteria are verified.
- Record commit SHA and actual checks.
- Add follow-up tasks instead of expanding the current task silently.
- Never claim a check passed unless it ran and its output was inspected.

End each run with: task ID/outcome (DONE/BLOCKED/FAILED), changed paths, tests actually run/results, security/migration impact, verified commit SHA on main, owner decisions needed, and next queue task.

Stop if repository identity is uncertain, main moved and cannot be safely updated, secrets appear exposed, destructive data changes are required, or a critical owner decision is missing. Report the concrete blocker.
