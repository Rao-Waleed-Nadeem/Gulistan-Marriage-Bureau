# Module 01 — Test Results

**Task:** GMB-C01  
**Branch:** `fix/c-01-disable-demo-auth`  
**Status:** Not yet executed / pending evidence

| Check | Required command or procedure | Result |
|---|---|---|
| Targeted auth tests | `cd frontend && npm test -- --? ` (confirm runner filtering before use) | Not tested |
| Full frontend tests | `cd frontend && npm test` | Not tested |
| Type check | `cd frontend && npm run lint` | Not tested |
| Production build | `cd frontend && npm run build` | Not tested |
| Former demo staff login | Attempt old demo credentials in isolated test environment | Not tested |
| Customer magic-link | Verify no session without real provider callback | Not tested |
| Legacy session cleanup | Seed old session key and reload; verify unauthenticated state | Not tested |
| Protected actions | Verify no synthetic staff session is created | Not tested |
| Staging authentication | Requires approved provider and staging configuration | Blocked — provider not configured |

No test is reported as passed until its command or procedure has actually been executed and its output recorded here.

## Evidence log

Add date, environment, exact command, exit code, relevant output and reviewer for every executed check.

## Acceptance

- Product Owner: Pending
- Technical reviewer: Pending
- Merge authorization: Not granted
