# 15. Staging & Production Deployment Runbook

**Status:** READY FOR OPERATIONAL EXECUTION  
**Date:** 2026-10-24  
**Task:** `T-014` (Staging deployment automation, live Supabase migration script, and production smoke-test harness)  
**Governing Specifications:** [`07-testing-release-operations.md`](07-testing-release-operations.md), [`14-release-readiness-review.md`](14-release-readiness-review.md)

---

## 1. Overview & Pre-requisites

This runbook guides engineering staff and the project owner through provisioning, configuring, migrating, and smoke-testing Gulistan Marriage Bureau on live Supabase cloud infrastructure.

### Cloud Architecture Baseline (Approved under ADR-002, OPEN-013, OPEN-014)
- **Database / Auth / Storage Provider:** Supabase
- **Hosting Tier:** Managed Pro ($25/mo at launch; Free tier during initial staging sandbox)
- **Target Cloud Region:** Middle East (`me-central-1`) or Singapore (`ap-southeast-1`) for optimal network latency (<70 ms) to Pakistan
- **Frontend Hosting:** Vercel or Cloudflare Pages (Node.js 18+ / Vite build)

---

## 2. Step-by-Step Provisioning Guide

### Step 2.1: Supabase Project Setup
1. Log into [Supabase Dashboard](https://supabase.com/dashboard).
2. Click **"New Project"**.
3. Choose Organization: `Gulistan Marriage Bureau`.
4. Enter Name: `gulistan-matrimonial-staging` (or `gulistan-matrimonial-prod`).
5. Set strong, high-entropy Database Password and store it in your secure password manager.
6. Region: Select **Middle East (me-central-1)** or **Singapore (ap-southeast-1)**.
7. Pricing Plan: Free for initial staging verification $\to$ Upgrade to Pro ($25/mo) before storing real customer profiles.

### Step 2.2: Retrieve Connection Strings & API Keys
From **Project Settings $\to$ API**:
- **Project URL:** `https://[your-project-ref].supabase.co`
- **anon (public) key:** `eyJhbGciOiJIUzI1NiIsInR5cCI...` (Safe for frontend `VITE_SUPABASE_ANON_KEY`)
- **service_role (secret) key:** `eyJhbGciOiJIUzI1NiIsInR5cCI...` (**Confidential: Backend / CI only! Never expose to frontend**)

From **Project Settings $\to$ Database**:
- **Connection string (URI):** `postgresql://postgres:[YOUR-PASSWORD]@db.[your-project-ref].supabase.co:5432/postgres`

### Step 2.3: Storage Bucket Configuration
1. Go to **Storage $\to$ Buckets**.
2. Click **"New bucket"**.
3. Name: `candidate-photos`.
4. **Public bucket:** Ensure this toggle is **OFF** (strictly private).
5. File size limit: `5242880` (5 MB).
6. Allowed MIME types: `image/jpeg, image/png, image/webp`.

---

## 3. Applying Migrations to Live Database

The repository provides an automated, idempotent migration runner that tracks applied schema versions and verifies SHA-256 checksums:

```bash
# 1. Export database connection in terminal or local .env (ignored by Git)
export DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# 2. Run the deployment runner
npm --prefix backend run deploy:migrations
```

The runner automatically:
1. Verifies database connectivity.
2. Checks existing `schema_migrations` history.
3. Applies `00001_initial_schema_baseline.sql` (Profiles, Consents, Audit Events, RLS policies).
4. Applies `00002_financial_ledger.sql` (Financial transactions, positive amount checks, append-only policies).
5. Records migration versions and timestamps.

---

## 4. Smoke-Testing the Live Environment

Before pointing client traffic or enabling non-mock mode, run the non-destructive smoke-test harness:

```bash
# Export target staging variables
export SUPABASE_URL="https://[PROJECT-REF].supabase.co"
export SUPABASE_ANON_KEY="[YOUR-ANON-KEY]"
export CANDIDATE_PHOTO_BUCKET="candidate-photos"

# Run smoke test suite
npm --prefix backend run smoke:test
```

**Verification criteria checked by smoke-test:**
- Public config sanity (valid HTTPS URL, non-empty anon key).
- Zero service-role leakage into client `VITE_` variables.
- All 4 core tables (`profiles`, `candidate_consents`, `audit_events`, `financial_transactions`) have active RLS.
- Anonymous unauthenticated access is completely revoked.
- `candidate-photos` bucket is private and requires signed URLs.

---

## 5. Frontend Production Release

### Environment Variables on Hosting Platform (e.g. Vercel / Cloudflare Pages)

| Variable | Target Value | Exposure |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://[PROJECT-REF].supabase.co` | Public |
| `VITE_SUPABASE_ANON_KEY` | `[YOUR-ANON-KEY]` | Public |
| `VITE_APP_ENV` | `production` (or `staging`) | Public |
| `VITE_USE_MOCK_DATA` | `false` (enables live database connection) | Public |

*Security check:* Verify that **NO** `SUPABASE_SERVICE_ROLE_KEY` is defined in frontend project settings.

### Build and Deploy Command
```bash
npm run build
```
Verify build finishes with 0 TypeScript errors and output directory is set to `dist/`.

---

## 6. Post-Deployment Verification Checklist

- [ ] Matchmaker login with staff credentials (Nadeem Ahmed) functions properly.
- [ ] Role switcher correctly enforces fail-closed behavior when unauthenticated.
- [ ] Candidate intake wizard saves `pending_review` profile.
- [ ] Photo upload generates high-entropy private storage key and displays via 48-hour signed URL.
- [ ] Financial transaction adds ledger entry and updates balance without allowing edit/delete.
- [ ] Audit logs record event without storing phone numbers, full names, or tokens.
