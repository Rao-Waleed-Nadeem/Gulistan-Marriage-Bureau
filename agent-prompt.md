Read `backend/docs/refactor/05-INDEPENDENT-REPOSITORY-AUDIT-2026-11-15.md` in full.

The previous refactoring tasks T-019 through T-030 are marked DONE, but an independent source audit has identified major implementation defects and false completion claims.

Start with T-031 from the audit's remediation sequence. Inspect the latest main branch and actual code before changing anything.

Implement exactly one task per run. Preserve the existing SRS, business logic, UI, architecture, source field meanings, and approved decisions. Do not silently change requirements.

Work directly on main, without pull requests or force-pushes. Run real tests, update the task queue and documentation, and commit only after verification. Never mark simulated operations as live success.

Stop and document any owner-only action, missing credential, legal decision or production approval required. After completing one task, report the next task and wait for the next run.