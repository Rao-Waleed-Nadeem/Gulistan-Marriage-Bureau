# 1. System Architecture and Technology Decisions

## 1.1 Product context

Gulistan is a bilingual Urdu/English, mobile-first marriage-bureau management PWA for Pakistan and potentially overseas families. Nadeem is the primary operational user. The system handles unusually sensitive information: identities, contact details, religion/aqeedah, caste/biradari, marital history, family relationships, income/property information, photographs, preferences and introduction history.

Business goals include structured profile management, human-reviewed matching, field-level controlled disclosure, WhatsApp message preparation, external matchmaker attribution, financial ledgers, follow-ups and customer self-service. The target of 100,000+ active profiles is a capacity requirement to validate through testing, not a promise about any free hosting plan.

## 1.2 Current frontend — preserve it

**DECIDED:** Keep the existing application as React 19 + Vite 8 + TypeScript + Tailwind CSS v4. The current application is a Vite SPA. Do not migrate to Next.js merely to implement a backend.

Known frontend entry points:
- `frontend/src/App.tsx`: current local state and demo persona switching.
- `frontend/src/types/index.ts`: current domain types.
- `frontend/src/data/mockData.ts`: synthetic prototype data.
- `frontend/src/features/matchmaker/ProfileWizard.tsx`: profile wizard.
- `frontend/src/features/matchmaker/MatchReview.tsx`: current match review UI.
- `frontend/src/components/matching/ControlledSharingModal.tsx`: field-disclosure UI.
- `frontend/src/utils/matchmaker.ts`: prototype matching calculation.
- `frontend/src/utils/whatsapp.ts`: message formatter.
- `frontend/src/utils/finance.ts`: prototype ledger calculation.
- `frontend/src/i18n/translations.ts`: English and Urdu strings.

Treat these files as UI/domain evidence. They are not authoritative backend policy and must not be trusted to enforce permissions.

## 1.3 Backend baseline

**PROPOSED, pending provider/account validation:**
- Supabase PostgreSQL for durable relational data.
- Supabase Auth for identity and sessions.
- Supabase Storage with private buckets for photos.
- Supabase SQL migrations as the authoritative schema history.
- Row-Level Security (RLS) and least-privilege grants for database access.
- Supabase Edge Functions for operations that require trusted server-side authorization, secret keys, token handling, or cross-table atomic workflows that should not be exposed as client-side sequences.
- TypeScript in the frontend; use TypeScript Edge Functions only where needed.
- GitHub for source control and CI checks.
- Dockerfile as an optional reproducible build/test path; Docker is not required for everyday frontend development.

Do not introduce Next.js, Express as a second API, Python, microservices, Redis, a message broker, or Kubernetes at the start without a written architecture decision explaining the need.

## 1.4 Trust boundaries

1. **Browser is untrusted.** Every field, role, profile ID, photo ID, share option and requested operation can be manipulated.
2. **Auth identifies a user; it does not automatically authorize every action.**
3. **RLS is a required database boundary**, but not a substitute for explicit server-side authorization and correct SQL grants.
4. **Service-role/secret keys are server-only.** Never use them in Vite variables prefixed with `VITE_`, client bundles, logs, screenshots or committed files.
5. **Private photos are separate objects.** Store storage paths and metadata in PostgreSQL, not binary image data or unrestricted public URLs in profile rows.
6. **External sharing is a disclosure boundary.** A share must be created from an approved snapshot of explicitly authorized fields, with expiry/revocation rules.
7. **AI output is untrusted.** It cannot approve profiles, approve matches, grant permissions, or decide consent.

## 1.5 Proposed logical architecture

```text
React + Vite PWA
  ├── Supabase Auth client (session only; never role authority)
  ├── Typed feature/repository layer
  │     └── PostgreSQL through Supabase client + RLS for allowed CRUD
  ├── Trusted Edge Functions
  │     ├── public registration intake / abuse controls (policy to finalize)
  │     ├── controlled-share creation, retrieval, expiry and revocation
  │     ├── privileged status/role transitions where needed
  │     ├── atomic match-review and audit workflows
  │     └── other actions whose invariants cannot safely be enforced client-side
  ├── PostgreSQL
  │     ├── profiles + restricted contact data
  │     ├── preferences, siblings, photos, consent
  │     ├── match cases, evaluations, decisions
  │     ├── external matchmakers, financial ledger, follow-ups
  │     └── audit events and share grants
  └── Private object storage for profile photographs
```

This is a logical design, not a claim that resources have already been provisioned.

## 1.6 Architecture principles

- Modular monolith / managed backend first.
- Database constraints for data integrity; RLS for row access; server-side functions for sensitive business transitions.
- Explicit status transitions; no arbitrary status strings.
- Every meaningful record has stable UUID identity and timestamps.
- Keep profile facts, preferences, consent, operational notes and disclosure snapshots distinct.
- Avoid storing calculated totals when they can be derived reliably; if caching is later required, define reconciliation.
- Prefer SQL migrations over manual dashboard-only schema edits.
- No sensitive personal data in URLs, analytics, exception messages or audit detail text.
- Make backup restoration and data export procedures testable.
- Add infrastructure only when measured scale or a real requirement justifies it.

## 1.7 Environments and configuration

Use separate development and production Supabase projects. Add staging before a broad pilot. Do not point local development at production customer data.

Expected browser-safe variables should be documented in `frontend/.env.example` only after the actual chosen auth/backend configuration is confirmed. Vite exposes `VITE_*` variables to the browser: only public project URL and publishable/anon key may be present there. Never add service-role credentials or third-party private keys.

The current `frontend/.env.example` refers to Gemini and an AI Studio/Cloud Run runtime. That is not a Supabase configuration and must not be blindly repurposed. Remove or replace it only in a separately reviewed integration change, after confirming whether the AI Studio deployment remains a supported target.

## 1.8 Docker decision

**DECIDED:** Include Docker support when the app's production build and hosting target are known; do not require Docker for everyday development. A Dockerfile should build and serve the Vite static output in a documented, reproducible way. Do not put PostgreSQL or Supabase production services inside Docker. Local Supabase CLI/Docker may be used for local backend testing if the development environment supports it. Docker does not replace backups, secrets management, RLS, or operational monitoring.
