# Gulistan Marriage Bureau — Documentation Bible

**Status:** Working engineering baseline for backend implementation  
**Repository:** `Rao-Waleed-Nadeem/Gulistan-Marriage-Bureau`  
**Baseline date:** 2026-10-23

This directory is the engineering source of truth for turning the existing frontend prototype into a secure, persistent product. It is written for human maintainers and AI coding agents.

## Agent entry point — read this first

1. Root [`AGENTS.md`](../../AGENTS.md) — binding repository-wide rules and safety boundaries.
2. [`agent-prompt.md`](../../agent-prompt.md) — repeatable one-task-per-run command.
3. [`../AGENT_TASK_QUEUE.md`](../AGENT_TASK_QUEUE.md) — task order, dependencies, acceptance criteria, status and history.
4. Then read the specifications relevant to the selected task below.

On every invocation, the agent must choose the first eligible READY task, execute exactly one task, verify it, update the queue/docs, commit directly to `main`, verify the commit and stop with a report. No branches or pull requests.

## Read the specifications in this order

1. [System architecture and decisions](01-system-architecture.md)
2. [Data model](02-data-model.md)
3. [Authorization and privacy](03-authorization-and-privacy.md)
4. [Backend workflows and contracts](04-backend-workflows.md)
5. [Matching and controlled sharing](05-matching-and-sharing.md)
6. [Frontend integration](06-frontend-integration.md)
7. [Testing, release and operations](07-testing-release-operations.md)
8. [AI agent operating contract](08-ai-agent-contract.md)
9. [Open decisions and decision log](09-open-decisions.md)
10. [Frontend domain inventory](10-frontend-domain-inventory.md) — source-grounded inventory of candidate models, repeating siblings, land conversions, preferences, matching, disclosures, and ledger semantics created under T-001.
11. [Minimum owner decision sheet](11-owner-decision-sheet.md) — plain-language decision options for authentication, staff hierarchy, intake workflow, consent proof, hosting budget, and cloud jurisdiction created under T-002.

## Authority and conflict resolution

Use this order when instructions conflict:

1. Explicit decisions recorded by the project owner in the current conversation or an approved decision record.
2. This documentation Bible, especially approved architecture and security requirements.
3. The SRS `SRS-Gulistan-Marriage-Buearu.txt` as the product-requirements baseline.
4. Existing frontend source as evidence of current UI/domain shapes, not proof of backend behavior or security.
5. Existing README and older agent prompts, which may describe earlier states and must be updated when stale.
6. General assumptions by the agent (lowest authority).

Never silently resolve a business ambiguity by inventing a policy. Record it in [open decisions](09-open-decisions.md), implement safe boundaries, and ask for a decision when it blocks a consequential choice.

## Current verified repository state

- Frontend: React + Vite + TypeScript + Tailwind CSS v4; confirm actual package/config files before changing tooling.
- Existing UI uses local React state and synthetic records from `frontend/src/data/mockData.ts`.
- UI/domain types are in `frontend/src/types/index.ts`.
- Matching, finance, units and WhatsApp formatting helpers exist under `frontend/src/utils/`.
- The current role switcher is a prototype persona switcher, not authentication or authorization.
- The 300-frame scroll animation currently lives under `frontend/public/frames/`; do not remove or rework it as part of backend tasks.
- No production backend implementation or authoritative database migrations were found in the inspected repository tree.
- Supabase remains a proposal pending provider/account/region/plan and recovery validation.

## Core rule

**Preserve the existing frontend and integrate a backend incrementally.** Do not migrate to Next.js, replace Vite, redesign the UI, delete mock data, or change the animation as part of backend work unless the project owner explicitly approves a separate task.
