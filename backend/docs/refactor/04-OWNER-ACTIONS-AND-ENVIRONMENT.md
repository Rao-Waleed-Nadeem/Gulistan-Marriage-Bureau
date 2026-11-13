# 4. Owner Actions and Environment Setup

Antigravity can write code, migrations, tests, templates and runbooks. It cannot independently create/approve your provider account, know private credentials, agree to billing/legal terms, verify your identity or make business decisions requiring you.

## 4.1 Owner-only actions

| Action | Owner must do | Antigravity can prepare | Safety |
|---|---|---|---|
| Supabase organization/projects | Create/access dev, staging and production projects | Setup checklist/scripts | Separate environments. |
| Region and plan | Choose provider region/plan | Compare documented options | Docs propose Middle East or Singapore, Free for development and Pro at launch; verify current availability/pricing. |
| Public project URL/key | Copy from Supabase dashboard | Env schema and client wiring | Public values only; do not commit personal project config. |
| Server secrets | Enter in Edge Function secrets/secret manager | Variable names and validation | Never paste service-role/database credentials into chat, prompts, frontend env or Git. |
| Email delivery/SMTP | Configure provider | Auth redirect/test procedure | Magic link/password email requires working delivery. |
| Site and redirect URLs | Set approved local/staging/prod URLs | Callback validation | Do not invent production domain. |
| Initial staff/admin users and roles | Provision through controlled admin workflow | Secure seed/admin process | No public staff role signup. |
| Synthetic test accounts | Create or authorize test identities | Test scripts | Never use real candidate PII. |
| Billing upgrade | Approve | Usage/limit report | No billing changes without approval. |
| Office/WhatsApp contact | Supply verified details | Config/UI integration | Placeholder +92 300 0000000 must not be used in production. |
| Finance model | Owner/accountant approve | Model and tests | Confirm true double-entry vs partner sub-ledger and fee terms. |
| Self-service onboarding | Approve workflow | Pending-review screens | Confirm magic link to existing profile vs new pending request, verification and approval. |
| Staff MFA/recovery | Decide | Implement and test | Do not weaken security. |
| Privacy/consent/retention | Owner/legal adviser review | Technical workflow | AI cannot provide legal sign-off. |
| Real data migration | Approve each batch | Dry-run/mapping/dedupe reports | Do not upload real chats/gallery to public AI tools. |
| Production deployment/cutover | Explicitly approve | Runbook and rollback | Only after verified staging and backups. |

## 4.2 Environment variables

Current frontend config reads:
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- VITE_APP_ENV
- VITE_USE_MOCK_DATA

Example local values belong in the exact frontend env file configured by Vite (normally frontend/.env.local). Set VITE_APP_ENV=development and VITE_USE_MOCK_DATA=false only after a development Supabase project is configured. The SDK/provider may use a publishable key rather than anon key; verify current dashboard and SDK naming before changing code.

Server-side values may include SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CANDIDATE_PHOTO_BUCKET and APP_ENV, but the final list must be derived from actual Edge Functions and hosting configuration. These are configured only in Supabase Edge Function secrets or approved server secret manager. Never use VITE_ for privileged secrets. Never commit real .env files.

## 4.3 Owner local setup checklist
1. Open repository in Antigravity and ensure branch main.
2. Protect uncommitted work; do not reset it.
3. Create a development Supabase project.
4. Put only project URL and public client key in local frontend env file.
5. Configure server secrets directly in provider secret manager.
6. Configure Auth provider, email delivery and local callback URLs.
7. Ask Antigravity to run local checks and staging integration once required values exist.
8. Agent reports missing variable names only, never values.
9. Repeat with separate staging project.
10. Production, billing, real data and go-live remain owner-controlled.

## 4.4 Secret handling
Do not send passwords, service-role keys, database passwords, private keys, inbox credentials or WhatsApp credentials in chat. Do not put them in agent-prompt.md, AGENTS.md, issues, source or commit messages. Enter them directly into provider secure storage. If ever committed/pasted unsafely, rotate and review logs.

## 4.5 Owner decisions still needed
1. Confirm the exact Supabase Auth implementation commit and whether it is deployed to dev.
2. Decide staff MFA.
3. Define self-service: magic link to existing profile vs creating pending profile request; verification and Nadeem approval.
4. Approve consent wording and disclosure scopes with legal/business review.
5. Approve finance model and examples for payable, receivable, paid, received and reversal.
6. Supply verified office contact/WhatsApp details.
7. Approve AI data policy before external processing of candidate PII.
8. Confirm region and retention/legal obligations.
9. Approve each real-data import batch and production cutover.

## 4.6 First owner action
Before the next implementation run, ensure the claimed auth code is committed or present in the Antigravity workspace, create/configure a development Supabase project, and place only the public URL/key in the local frontend env file. Keep service-role/database credentials in the provider secret store. Then run the universal prompt. Do not share secret values with the agent or chat.
