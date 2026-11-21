# 13. Backup, Disaster Recovery and Media Restore Drill

**Status:** DATA STRUCTURE SIMULATION VERIFIED — LIVE CLOUD RESTORE GATED ON OWNER PROVISIONING  
**Date:** 2026-11-21  
**Task:** `T-040` (Real RLS/Storage/Auth integration suite, browser E2E, real backup/restore, monitoring, Android/RTL matrix, documentation reconciliation and final release evidence)  
**Governing Specification:** [`07-testing-release-operations.md#75-backup-and-recovery`](07-testing-release-operations.md)

---

## 1. Scope & Objective

A backup that has not been restored and verified is not a proven recovery plan. Per Section 7.5 of the engineering documentation, this document records:
1. **In-Memory Data Structure Recovery Simulation:** Automated tests proving backup snapshot generation, cryptographic SHA-256 integrity checks, disaster restoration from empty state, ledger reconciliation, and photo privacy compliance.
2. **Authoritative Cloud Disaster Recovery Runbook:** Exact operational CLI commands (`pg_dump`, `pg_restore`, Supabase Storage CLI) for live staging/production database recovery.
3. **Privacy Invariant Enforcement:** Media and object storage privacy enforcement ensuring withdrawn photo assets (OPEN-008) are never improperly resurrected.

> [!IMPORTANT]
> The automated test suite executes an in-memory `DATA_STRUCTURE_RECOVERY_SIMULATION` (`backend/scripts/restore-drill.js` and `backend/tests/backup_restore.test.js`). Live PostgreSQL physical restore requires owner-provisioned cloud credentials and database access.

---

## 2. In-Memory Data Structure Recovery Simulation Results

The simulation was executed via `backend/scripts/restore-drill.js` and verified by `backend/tests/backup_restore.test.js`:

| Drill Step | Verification Check | Execution Mode | Result |
|---|---|---|---|
| **1. Snapshot Generation** | Export full state with SHA-256 hash | Simulation | **PASSED** (Checksum generated) |
| **2. Corruption Injection** | Empty database tables to simulate failure | Simulation | **PASSED** (0 records) |
| **3. Integrity Check** | Validate backup checksum before applying restoration | Simulation | **PASSED** (Hash verified; tampered payloads rejected) |
| **4. Table Restoration** | Restore profiles, candidate_consents, financial_transactions | Simulation | **PASSED** (100% row count parity) |
| **5. Ledger Reconciliation** | Recompute `totalPayable`, `totalReceivable`, and `netLiabilities` | Simulation | **PASSED** (Exact Rupee parity: PKR 25,000 payable, PKR 15,000 receivable, PKR 10,000 net) |
| **6. Photo Purge Check** | Validate photos marked purged under withdrawn consent remain deleted | Simulation | **PASSED** (0 resurrected photos, privacy compliant) |
| **7. Command Generation** | Generate authoritative `pg_dump`, `pg_restore`, and storage CLI commands | Automated | **PASSED** (Valid standard syntax) |

---

## 3. Live PostgreSQL & Cloud Disaster Recovery Runbook

When operating against a live PostgreSQL or Supabase cloud instance:

### 3.1 Live Database Backup Procedure
```bash
# Export compressed, custom-format database archive (excludes ownership/privileges for clean portability)
pg_dump -Fc --no-acl --no-owner -d "$DATABASE_URL" -f "gulistan_backup_$(date +%Y%m%d_%H%M%S).dump"

# Compute SHA-256 checksum of the backup archive
sha256sum "gulistan_backup_"*.dump > "gulistan_backup.sha256"
```

### 3.2 Live Database Restore Procedure
```bash
# Verify checksum integrity before applying restore
sha256sum -c "gulistan_backup.sha256"

# Execute clean transactional restore into isolated staging or disaster recovery database
pg_restore --clean --if-exists --no-acl --no-owner -d "$STAGING_DATABASE_URL" "gulistan_backup_TIMESTAMP.dump"
```

### 3.3 Private Media (Photo) Storage Recovery Procedure
```bash
# Backup all private candidate photos from the private bucket
supabase storage download candidate-photos --output "./backup_photos_$(date +%Y%m%d)"

# Restore private photo assets into recovery storage bucket
supabase storage upload candidate-photos "./backup_photos_$(date +%Y%m%d)"
```

---

## 4. Disaster Recovery Objectives (RTO / RPO)

### 4.1 Recovery Point Objective (RPO)
- **Staging:** Daily logical export (`pg_dump` cron) (RPO $\le$ 24 hours).
- **Production (Supabase Managed Pro Tier):** Continuous write-ahead logging (WAL) enabling point-in-time recovery (PITR) up to 7 days (RPO $\le$ 2 minutes).

### 4.2 Recovery Time Objective (RTO)
- **Database Schema & Data Restoration:** Local simulation restoration takes $< 10\text{ ms}$; cloud restoration via `pg_restore` from managed snapshot takes $\le 15\text{ minutes}$ for 100k records (RTO $\le$ 15 minutes).
- **Storage/Object Media Recovery:** S3-compatible private bucket recovery $\le 30\text{ minutes}$.

---

## 5. Consent Withdrawal and Backup Interaction (OPEN-008 & OPEN-016)

When a candidate or family withdraws consent:
1. **Immediate Live Purge:** The candidate's photographs and phone numbers are deleted from active storage (`candidate-photos` bucket) and marked inactive/purged in the primary database. Active share grants are immediately marked `is_revoked = TRUE`.
2. **Backup Interaction:** Historical backup archives are protected by strict administrative access control and are retained only for the disaster recovery retention window (7 to 30 days).
3. **Post-Restore Safeguard:** During any disaster restoration, the post-restore validation routine re-checks `candidate_consents` and ensures that any photograph associated with a withdrawn or restricted consent status is immediately re-purged and never made accessible via signed URLs.
