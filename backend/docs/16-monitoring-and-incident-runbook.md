# 16. Production Monitoring, Alerting & Incident Response Runbook

**Status:** APPROVED & TESTED  
**Date:** 2026-11-14  
**Task:** `T-030` (Backup, restore, monitoring, Android/RTL and final release)  
**Governing Specifications:** [`01-system-architecture.md`](01-system-architecture.md), [`03-authorization-and-privacy.md`](03-authorization-and-privacy.md), [`07-testing-release-operations.md`](07-testing-release-operations.md)

---

## 1. System Health & Telemetry Architecture

Gulistan Marriage Bureau utilizes a zero-trust, privacy-minimizing operational telemetry pipeline.
Per Section 3.7 and OPEN-016: **No telemetry, monitoring metrics, or application logs may ever record candidate full names, phone numbers, raw photo URLs, or message bodies.**

### 1.1 Five-Component Health Boundary (`CFG-04`)
The health endpoint distinctly evaluates 5 separate infrastructure subsystems:

| Component | Monitored Metric | Target SLA | Degraded Trigger |
|---|---|---|---|
| **1. Configuration** | Env presence, zero leaked service keys | 100% | Leaked `VITE_*` secret or missing config |
| **2. Gateway** | Edge router latency, TLS 1.3 handshake | p99 < 50ms | HTTP 5xx rate > 0.5% over 5 mins |
| **3. Auth Provider** | Supabase Auth API response, JWT validation | p95 < 20ms | Auth error rate > 1.0% |
| **4. Database (PostgreSQL)** | RLS query latency, active connections | p95 < 25ms | Pool utilization > 80% or query > 100ms |
| **5. Storage (S3 Private Bucket)** | Signed URL generation & token hash validation | p95 < 15ms | Storage 4xx/5xx errors > 1% |

---

## 2. Automated Alert Triggers & Paging Thresholds

| Severity | Alert Rule | Threshold | Notification Channel | Remediation SLA |
|---|---|---|---|---|
| **P0 - Critical** | Database RLS policy bypass attempt or anon table scan | $\ge 1$ occurrence | Immediate SMS / PagerDuty to Admin | $\le 15$ minutes |
| **P0 - Critical** | Service-role secret detected in client logs / VITE variables | $\ge 1$ occurrence | Immediate PagerDuty to Admin | Immediate Key Rotation |
| **P0 - Critical** | Ledger reconciliation imbalance (`discrepancyCount > 0`) | $\ge 1$ occurrence | PagerDuty to Lead Matchmaker & Admin | $\le 30$ minutes |
| **P1 - High** | Brute force login attempts on staff account | $\ge 5$ failures in 10 mins | Email + Telegram to Admin | $\le 1$ hour (IP throttled) |
| **P1 - High** | Photo bucket storage quota exceeds 80% | Storage $\ge 80\%$ | Email to Admin & Owner | $\le 24$ hours (Archive/Purge) |
| **P1 - High** | Migration batch dry-run validation error rate | $> 10\%$ errors | Dashboard notice to Nadeem | Pre-import review |
| **P2 - Medium** | Candidate photo withdrawal purge failure | Any purge timeout | Ops log alert | $\le 2$ hours |

---

## 3. Incident Response Runbooks

### Runbook 1: Leaked Client Secret or Service Role Key Rotation
**Condition:** A service-role key or database secret appears in logs, commits, or client error reports.
1. **Immediate Revocation:** Access Supabase Dashboard $\to$ Project Settings $\to$ API $\to$ Generate new `service_role` key.
2. **Environment Update:** Update secrets in Edge Functions secret store and backend deployment host.
3. **Audit Log Inspection:** Query `public.audit_events` for any actions authenticated via the compromised key during the exposure window:
   ```sql
   SELECT * FROM public.audit_events 
   WHERE created_at >= NOW() - INTERVAL '24 hours' 
   ORDER BY created_at DESC;
   ```
4. **Invalidate Client Sessions:** Rotate JWT signing secret in Auth settings to force all active sessions to re-authenticate.
5. **Verify Hygiene:** Run `npm --prefix backend test` and `node backend/scripts/smoke-test.js`.

---

### Runbook 2: Suspected Photo Leak or Uncertified Access Containment
**Condition:** A report of unauthorized photo access or compromised proposal link.
1. **Instant Token Revocation:** Revoke all active share grants for the target candidate profile:
   ```sql
   UPDATE public.share_grants 
   SET status = 'revoked', revoked_at = NOW() 
   WHERE candidate_profile_id = 'TARGET_PROFILE_ID';
   ```
2. **Purge Signed URLs:** Clear edge cache and rotate storage bucket signed token secret.
3. **Verify Candidate Consent State:** Check `public.candidate_consents` and transition profile to `restricted`:
   ```sql
   UPDATE public.profiles 
   SET status = 'restricted' 
   WHERE id = 'TARGET_PROFILE_ID';
   ```
4. **Notify Family & Lead Matchmaker:** Nadeem Ahmed directly contacts family representative to confirm containment.

---

### Runbook 3: Disaster Recovery & Database Point-in-Time Restore (PITR)
**Condition:** Catastrophic data corruption, accidental drop, or regional outage.
1. **Determine Incident Timestamp ($T_{incident}$):** Identify exact minute of corruption from audit log.
2. **Trigger PITR Recovery:** In Supabase Managed Pro Console $\to$ Database $\to$ Backups $\to$ Select Point in Time ($T_{incident} - 5\text{ minutes}$).
3. **Execute Post-Restore Verification Drill:**
   - Execute `node backend/scripts/restore-drill.js`.
   - Verify 100% row parity across all tables.
   - Verify financial ledger balances to the exact Rupee (`reconcileLedger`).
   - Verify that photos belonging to candidates with withdrawn consent remain purged (`is_purged = true`) with zero resurrected photos.
4. **Re-enable Application Traffic:** Verify smoke test pass via `node backend/scripts/smoke-test.js` before opening customer routes.

---

### Runbook 4: Migration Batch Rollback
**Condition:** A staged WhatsApp or gallery import batch is discovered to have corrupted source data or uncertified consent.
1. **Execute Rollback Command:** Call `rollbackMigrationBatch(batchId, reason, adminSession)` via Admin Portal or CLI script.
2. **Verify Profiles Restricted:** Confirm all imported records from the batch transition to `restricted` status and are removed from search matching pools.
3. **Verify Ledger / Audit Entries:** Audit log records `MIGRATION_BATCH_ROLLED_BACK` with actor, timestamp, and justification.
4. **Reconcile Batch:** Run `reconcileMigrationBatch` to confirm 100% accounted rows.
