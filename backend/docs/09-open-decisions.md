# 9. Open Decisions and Decision Log

Do not silently invent answers to these questions. Keep this file updated as the owner makes decisions. A decision is considered approved only when the owner confirms it or an explicit accepted decision record is committed.

## 9.1 Initial decision log

| ID | Topic | Status | Current baseline / next action |
|---|---|---|---|
| ADR-001 | Preserve existing frontend stack | DECIDED | Keep React 19 + Vite 8 + TypeScript + Tailwind v4; no Next.js migration for backend work. |
| ADR-002 | Backend provider | PROPOSED | Supabase PostgreSQL/Auth/Storage/Edge Functions. Verify account, region, current pricing/quotas, auth options and recovery before production. |
| ADR-003 | Docker | DECIDED | Optional reproducible app build/test path; not required for daily development; do not self-host production PostgreSQL in Docker initially. |
| ADR-004 | AI | DECIDED | Basic search/matching works without paid AI. AI is optional and cannot authorize/approve/share. |
| ADR-005 | Source of truth | DECIDED | SQL migrations and this documentation Bible; UI mock data is not production truth. |
| OPEN-001 | Authentication method | OPEN | Decide email/password, magic link, phone OTP or other method after reviewing cost, usability and account recovery. No method is assumed. |
| OPEN-002 | Staff access scope | OPEN | Is Nadeem the only matchmaker initially? Can future staff have assigned profiles or global access? |
| OPEN-003 | Public registration | OPEN | Is unauthenticated registration permitted? What rate limits, CAPTCHA and review steps are required? |
| OPEN-004 | Consent authority | OPEN | Who may submit on behalf of a candidate, and what proof/consent is required? Guardian/representative handling needs a policy. |
| OPEN-005 | Customer visibility | OPEN | Which fields and recommendations can a customer view before and after a human-approved introduction? |
| OPEN-006 | Sharing recipient | OPEN | Must recipients authenticate, or can a time-limited bearer link be used? What expiry default is acceptable? |
| OPEN-007 | Profile state machine | OPEN | Approve exact status names and permitted transitions; current UI mixes approval, active and introduction authorization. |
| OPEN-008 | Data retention/deletion | OPEN | Retention periods for profiles, photos, audit events, inactive records and financial records; define deletion/backup behavior. |
| OPEN-009 | Matching rules | OPEN | Approve mandatory/soft criteria, weights, unknown-value treatment, tie-breaking, score labels and allowed sensitive criteria. |
| OPEN-010 | Matchmaker finance semantics | OPEN | Define payable/receivable vs paid/received, sign convention, commission timing, settlement, reversals and reporting. |
| OPEN-011 | Property and sibling fields | OPEN | Clarify whether property means land/home/value and which sibling marriage details are required; confirm units. |
| OPEN-012 | Profile verification | OPEN | Which facts require evidence, who verifies them and how verification expiry/revocation works? |
| OPEN-013 | Production hosting budget | OPEN | SRS starts with a $0 target; validate provider limits and storage/bandwidth. Do not promise free production at target scale. |
| OPEN-014 | Data jurisdiction/legal review | OPEN | Confirm applicable Pakistan and other jurisdiction privacy/retention obligations and provider data location before production. |
| OPEN-015 | AI processing | OPEN | If enabled, which data may be sent to which provider, what notice/consent is needed, and what retention applies? |
| OPEN-016 | PWA/offline behavior | OPEN | Confirm whether offline profile access is prohibited (recommended for sensitive data) and which non-sensitive screens may cache. |

## 9.2 Safe defaults while decisions are open

- Deny access by default.
- Keep profiles, contact details and photographs private.
- New registrations are pending review.
- Do not share a profile until a human matchmaker approves the match and the required consent exists.
- Default discretionary disclosure fields to withheld.
- Use synthetic data only outside production.
- No automated bulk WhatsApp messaging.
- No autonomous AI approval or access-control decisions.
- No customer browsing of the private profile registry.
- No production launch until consent, retention, access scope, provider plan and recovery are confirmed.
- If a question affects privacy, legal compliance, financial correctness or irreversible data changes, pause and request owner input.

## 9.3 How to close an open decision

For each decision, add:
- Decision ID.
- Question and options considered.
- Owner's chosen option and date.
- Consequences for schema, UI, security and operations.
- Any migration required.
- Tests that prove the choice is implemented.

Update this file and all affected specifications in the same reviewed change. Never let a decision exist only in chat or an agent's memory.
