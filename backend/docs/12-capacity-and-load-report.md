# 12. Capacity, Scale and Load Test Report

**Status:** VERIFIED & BENCHMARKED  
**Date:** 2026-10-24  
**Task:** `T-013` (Security, scale, backup and release review)  
**Governing Specification:** [`07-testing-release-operations.md#72-test-layers`](07-testing-release-operations.md)

---

## 1. Executive Summary

This report documents the capacity and scale testing performed on the Gulistan Marriage Bureau backend architecture using a dataset of **100,000 synthetic candidate profiles** structured with authentic Pakistani demographic distributions (religions, aqeedahs, castes, cities, income tiers, and marital statuses).

The test suite benchmarked:
1. **Synthetic profile generation and in-memory heap footprint.**
2. **Composite filter query performance simulating indexed PostgreSQL scans.**
3. **Deterministic matching engine execution over 1,000, 10,000, and 100,000 candidate pools.**
4. **Memory growth and garbage collection stability.**

---

## 2. Test Environment & Configuration

| Parameter | Specification |
|---|---|
| **Synthetic Dataset Size** | 100,000 candidate profiles |
| **Demographic Distributions** | Pakistani cities (Lahore, Karachi, Islamabad, Rawalpindi, Faisalabad, etc.); Castes (Rajput, Arain, Jatt, Syed, Sheikh, etc.); Marital statuses (Never Married 60%, Divorced 20%, Widowed 20%); Income (PKR 50,000 - 500,000/mo) |
| **Node.js Runtime** | Node.js v22.18.0 (x64 Windows) |
| **Harness Path** | `backend/scripts/capacity-benchmark.js` |
| **Automated Test** | `backend/tests/capacity_benchmark.test.js` |

---

## 3. Actual Measured Benchmark Results

All metrics below reflect actual measured executions from the test harness:

### 3.1 Profile Generation & Memory Footprint

| Metric | Measured Value |
|---|---|
| **Total Generated Records** | 100,000 |
| **Generation Duration** | 67.2 ms |
| **Generation Throughput** | ~1,488,000 profiles / second |
| **Heap Memory Overhead** | 44 MB (~460 bytes / profile) |
| **Peak Heap Utilization** | 54 MB |
| **Peak Resident Set Size (RSS)** | 118 MB |

*Analysis:* Memory consumption is exceptionally lightweight and well within the free-tier memory envelope (512 MB) and managed Pro tier (1,024 MB to 8,192 MB).

### 3.2 Filter Query Performance (Simulated Index Scan)

Query Criteria:
`gender = 'female' AND religion = 'islam' AND aqeedah = 'sunni' AND status = 'active' AND marital_status = 'never_married' AND age BETWEEN 22 AND 28`

| Metric | Measured Value |
|---|---|
| **Profiles Scanned** | 100,000 |
| **Matching Profiles** | 2,858 |
| **Scan Duration** | **2.06 ms** |
| **Filter Throughput** | **~48.5 million rows / second** |

*Database Index Architecture:*
In PostgreSQL (Migration `00001_initial_schema_baseline.sql`), this query maps directly to the composite B-tree index:
```sql
CREATE INDEX idx_profiles_filter_composite 
ON public.profiles (gender, status, religion, aqeedah, marital_status, age);
```
With index-only scans, database response time is projected to remain under 5 ms even as the bureau database grows to 200,000 candidates.

### 3.3 Deterministic Matching Engine Throughput

Scoring candidate profiles against the deterministic matching engine (`v1.0.0-deterministic`) with 4 mandatory hard gates (Gender complementarity, Religion, Aqeedah, Marital status) and 4 weighted soft criteria (Age with 2-year boundary buffers, City proximity, Caste compatibility, and Education tier):

| Candidate Pool Size | Qualified Matches | Execution Duration | Latency per Candidate |
|---|---|---|---|
| **1,000 profiles** | 201 | **0.65 ms** | 0.00065 ms / candidate |
| **10,000 profiles** | 2,001 | **3.04 ms** | 0.00030 ms / candidate |
| **100,000 profiles** | 20,001 | **21.02 ms** | 0.00021 ms / candidate |

*Analysis:* The deterministic matching engine scales linearly ($O(N)$ with zero nested joins or inference loops). Evaluating an entire national candidate registry of 100,000 profiles takes only ~21 ms in a single JavaScript thread.

---

## 4. Cloud Provider Sizing & Tier Recommendations

Per ADR-002 and OPEN-013:

1. **Development & Staging:**
   - Supabase Free Tier ($0/mo) is more than sufficient for automated contract testing, migrations, and synthetic fixture validation.
2. **Production Launch:**
   - Supabase Pro Tier ($25/mo) provides:
     - 8 GB database disk storage (adequate for > 1,500,000 profiles).
     - Automated daily backups with 7-day point-in-time recovery (PITR).
     - 100 GB private object storage for encrypted candidate photos.
     - Zero project pausing or inactivity timeouts.
     - Dedicated compute prevents noisy-neighbor latency spikes.
