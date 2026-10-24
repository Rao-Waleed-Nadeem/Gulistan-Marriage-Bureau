# 9. Open Decisions and Decision Log

Do not silently invent answers to these questions. Keep this file updated as the owner makes decisions. A decision is considered approved only when the owner confirms it or an explicit accepted decision record is committed.

## 9.1 Initial decision log

| ID | Topic | Status | Current baseline / next action |
|---|---|---|---|
| ADR-001 | Preserve existing frontend stack | DECIDED | Keep React 19 + Vite 8 + TypeScript + Tailwind v4; no Next.js migration for backend work. |
| ADR-002 | Backend provider | DECIDED | Supabase PostgreSQL/Auth/Storage/Edge Functions confirmed as approved engineering baseline. Free tier in dev, Pro at launch. |
| ADR-003 | Docker | DECIDED | Optional reproducible app build/test path; not required for daily development; do not self-host production PostgreSQL in Docker initially. |
| ADR-004 | AI | DECIDED | Basic search/matching works without paid AI. AI is optional and cannot authorize/approve/share. |
| ADR-005 | Source of truth | DECIDED | SQL migrations and this documentation Bible; UI mock data is not production truth. |
| OPEN-001 | Authentication method | DECIDED | Hybrid (Option D): Staff uses Email/Password; Candidates/Families use Magic Link or WhatsApp Verified Link (zero SMS cost). |
| OPEN-002 | Staff access scope | DECIDED | Single Lead Matchmaker (Option A): Nadeem Ahmed is primary operational matchmaker; Admin has governance oversight. |
| OPEN-003 | Public registration | DECIDED | Closed Concierge Intake (Option A): Staff enters verified candidates from walk-ins/calls/WhatsApp interviews to prevent spam and ensure data fidelity. |
| OPEN-004 | Consent authority | DECIDED | Representative Legal Certification (Option A): Form captures submitter relationship with explicit legal certification of candidate consent. |
| OPEN-005 | Customer visibility | DECIDED | Human-gated introduction: candidate families view own data and approved recommendations; contact details/legal names remain locked until mutual consent and matchmaker authorization. |
| OPEN-006 | Sharing recipient | DECIDED | Time-limited signed bearer URLs (48-hour default expiry) delivered via WhatsApp; tokens hashed in DB; instant revocation support; private bucket storage. |
| OPEN-007 | Profile state machine | DECIDED | Approved 6-state taxonomy (`pending_review`, `approved`, `active`, `introduction_authorized`, `inactive`, `restricted`) with transition graph enforced in `frontend/src/lib/profiles.ts` and Migration 00001. |
| OPEN-008 | Data retention/deletion | DECIDED | Tiered retention: photos purged immediately on consent withdrawal/deletion; inactive profiles archived for 1 year before purge; immutable audit/financial ledgers retained permanently. |
| OPEN-009 | Matching rules | DECIDED | Hybrid deterministic algorithm: religion, aqeedah, and marital status are mandatory hard gates (score drops to 0 if failed); soft criteria (age, city, education, caste) weighted; human approval required. |
| OPEN-010 | Matchmaker finance semantics | DECIDED | Double-entry bureau convention: 'payable' is a liability (bureau owes partner), 'receivable' is an asset (partner owes bureau), net balance = receivable - payable, append-only traceable adjustments. |
| OPEN-011 | Property and sibling fields | OPEN | Clarify whether property means land/home/value and which sibling marriage details are required; confirm units. |
| OPEN-012 | Profile verification | DECIDED | Tiered verification: intake phone interview with family representative by Nadeem, self-declared data backed by legal certification (OPEN-004), physical document inspect on request. |
| OPEN-013 | Production hosting budget | DECIDED | Free Dev Tier to Managed Pro ($25/mo) at Launch (Option A): $0 during development; ~$25/mo at production launch for daily backups and private photo storage. |
| OPEN-014 | Data jurisdiction/legal review | DECIDED | Middle East (me-central-1) or Singapore (ap-southeast-1) (Option A): Lowest network latency (40-70ms) to Pakistan with enterprise SOC 2 compliance. |
| OPEN-015 | AI processing | OPEN | If enabled, which data may be sent to which provider, what notice/consent is needed, and what retention applies? |
| OPEN-016 | PWA/offline behavior | DECIDED | Strictly prohibit offline caching/storage of sensitive candidate profiles, photos, and financial transactions. Candidate data must only exist in runtime memory and must never be persisted to IndexedDB, LocalStorage, or CacheStorage. Only the static app shell (HTML/CSS/JS bundles and public marketing copy) may be cached for offline presentation. |

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


## 9.4 Decisions Closed on 2026-10-24

Per explicit owner directive ("choose yourself and read agent-prompt.md and follow it"), the recommended architecture and operational policies from `11-owner-decision-sheet.md` have been adopted:

1. **ADR-002 & OPEN-013 (Provider & Budget):** Supabase PostgreSQL, Auth, private Storage, and Edge Functions adopted. Free tier during development ($0/mo); upgrade to Pro ($25/mo) at production launch for point-in-time recovery, automated backups, and private candidate storage.
2. **OPEN-001 (Authentication):** Hybrid Model (Option D). High-entropy Email + Password for staff (Nadeem, Admin); secure Magic Links or WhatsApp verified links for candidate/family views. Avoids ongoing SMS gateway costs.
3. **OPEN-002 (Staff Scope):** Single Lead Matchmaker (Option A). Mr. Nadeem Ahmed is the authoritative lead matchmaker with global operational visibility. System Admin role handles governance.
4. **OPEN-003 (Candidate Intake):** Closed Concierge Intake (Option A). All candidates are onboarded by bureau staff from walk-in, phone, or WhatsApp inquiries. Eliminates bot spam and incomplete profiles.
5. **OPEN-004 (Consent Proof):** Representative Legal Certification Checkbox (Option A). Wizard captures submitter relation and requires formal confirmation of candidate awareness and consent.
6. **OPEN-014 (Data Region):** Middle East (`me-central-1`) or Singapore (`ap-southeast-1`) (Option A). Low latency (40–70 ms) to Pakistan with SOC 2 compliance.
7. **OPEN-005 & OPEN-009 (Matching Rules & Customer Visibility):** Deterministic matching engine. Religion, aqeedah, and marital status are mandatory hard gates (score drops to 0 if failed); soft criteria (age, city, education, caste) are weighted. Unknown values receive 0 score contribution. Contact details remain locked until mutual consent and Nadeem authorizes introduction. Human approval is strictly required before any proposal is shared.
8. **OPEN-006 & OPEN-008 (Photo Sharing & Retention):** Time-limited signed bearer URLs (48-hour default expiry) delivered via WhatsApp; instant revocation; immediate photo purge upon consent withdrawal; 1-year archive for inactive profiles; permanent immutable audit and ledger trails.
9. **OPEN-007 (Lifecycle State Machine):** Approved 6-state taxonomy (`pending_review`, `approved`, `active`, `introduction_authorized`, `inactive`, `restricted`) with enforced transition graph.
10. **OPEN-010 (Matchmaker Finance Semantics):** Double-entry bureau convention: 'payable' is a liability (bureau owes partner), 'receivable' is an asset (partner owes bureau), net balance = receivable - payable, append-only traceable adjustments.
11. **OPEN-016 (PWA & Offline Profile Storage):** Strict offline storage prohibition (Option A). Candidate profiles, photographs, phone numbers, and financial transaction records must NEVER be cached or persisted offline in browser IndexedDB, LocalStorage, or CacheStorage. Only the static application shell (HTML, CSS, JS, branding assets, and public marketing content) is permitted to be cached offline by service workers. This guarantees that private candidate records are never exposed on shared family devices or stolen hardware.
