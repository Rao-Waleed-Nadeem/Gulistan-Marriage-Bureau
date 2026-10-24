# 13. Backup, Disaster Recovery and Media Restore Drill

**Status:** TESTED & VERIFIED  
**Date:** 2026-10-24  
**Task:** `T-013` (Security, scale, backup and release review)  
**Governing Specification:** [`07-testing-release-operations.md#75-backup-and-recovery`](07-testing-release-operations.md)

---

## 1. Scope & Objective

A backup that has not been restored and verified is not a proven recovery plan. Per Section 7.5 of the engineering documentation, this document records the execution of an automated restore drill testing:
1. **Database snapshot generation with cryptographic SHA-256 integrity checks.**
2. **Disaster restoration from empty/corrupted state.**
3. **Data parity across candidate profiles, consent declarations, and audit logs.**
4. **Post-restore financial ledger reconciliation down to the exact Rupee per OPEN-010.**
5. **Media and object storage privacy enforcement ensuring withdrawn photo assets (OPEN-008) are never improperly resurrected.**
6. **Recovery Time Objective (RTO) and Recovery Point Objective (RPO) guarantees.**

---

## 2. Test Execution & Results

The automated restore drill was executed via `backend/scripts/restore-drill.js` and verified by `backend/tests/backup_restore.test.js`:

| Drill Step | Verification Check | Result |
|---|---|---|
| **1. Snapshot Generation** | Export full database state with SHA-256 hash | **PASSED** (Checksum generated) |
| **2. Corruption Injection** | Empty database tables to simulate catastrophic failure | **PASSED** (0 records) |
| **3. Integrity Check** | Validate backup checksum before applying restoration | **PASSED** (Hash verified; tampered payloads rejected) |
| **4. Table Restoration** | Restore profiles, candidate_consents, financial_transactions | **PASSED** (100% row count parity) |
| **5. Ledger Reconciliation** | Recompute `totalPayable`, `totalReceivable`, and `netLiabilities` | **PASSED** (Exact Rupee parity: PKR 25,000 payable, PKR 15,000 receivable, PKR 10,000 net) |
| **6. Photo Purge Check** | Validate that photos marked purged under withdrawn consent remain deleted | **PASSED** (0 resurrected photos, privacy compliant) |

---

## 3. Disaster Recovery Objectives

### 3.1 Recovery Point Objective (RPO)
- **Development & Staging:** Daily logical export (RPO = 24 hours).
- **Production (Supabase Managed Pro Tier):** Continuous write-ahead logging (WAL) enabling point-in-time recovery (PITR) up to 7 days (RPO < 2 minutes).

### 3.2 Recovery Time Objective (RTO)
- **Database Schema & Data Restoration:** Measured script restore takes < 10 ms for local state; projected cloud restoration from managed snapshot < 15 minutes (RTO $\le$ 15 minutes).
- **Storage/Object Media Recovery:** S3-compatible private bucket versioning and cross-region replication ensure photo asset recovery $\le$ 30 minutes.

---

## 4. Consent Withdrawal and Backup Interaction (OPEN-008 & OPEN-016)

When a candidate or family withdraws consent:
1. **Immediate Live Purge:** The candidate's photographs and phone numbers are deleted from active storage and marked inactive in the primary database.
2. **Backup Interaction:** Encrypted historical backup archives are protected by strict administrative access control and are retained only for the disaster recovery retention window (7 to 30 days).
3. **Post-Restore Safeguard:** During any disaster restoration, the post-restore validation routine re-checks `candidate_consents` and ensures that any photograph associated with a withdrawn or restricted consent status is immediately re-purged and never made accessible via signed URLs.
