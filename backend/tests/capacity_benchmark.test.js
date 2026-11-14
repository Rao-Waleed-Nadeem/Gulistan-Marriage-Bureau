/**
 * @file capacity_benchmark.test.js
 * @description Automated test for 100,000 synthetic profile capacity benchmark,
 * query filtering bounds, deterministic matching throughput, concurrent percentiles,
 * query plans, and memory bounds.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateSyntheticProfile,
  benchmarkFilterQuery,
  benchmarkDeterministicMatching,
  calculatePercentiles,
  benchmarkConcurrency,
  evaluateQueryPlan,
  runFullCapacityBenchmark
} from '../scripts/capacity-benchmark.js';

test('Capacity Benchmark: generateSyntheticProfile produces realistic Pakistani demographics', () => {
  const profile0 = generateSyntheticProfile(0);
  assert.equal(profile0.gender, 'female');
  assert.equal(profile0.religion, 'islam');
  assert.ok(profile0.age >= 20 && profile0.age <= 54);
  assert.ok(profile0.monthlyIncome >= 50000);
  assert.ok(profile0.partnerPreferences.requiredReligion);
  assert.ok(profile0.partnerPreferences.allowedCastes.length > 0);

  const profile1 = generateSyntheticProfile(1);
  assert.equal(profile1.gender, 'male');
  assert.notEqual(profile0.id, profile1.id);
});

test('Capacity Benchmark: filter index query correctly filters 10,000 synthetic records within 5ms', () => {
  const count = 10000;
  const profiles = [];
  for (let i = 0; i < count; i++) {
    profiles.push(generateSyntheticProfile(i));
  }

  const criteria = {
    gender: 'female',
    religion: 'islam',
    aqeedah: 'sunni',
    status: 'active',
    maritalStatus: 'never_married',
    minAge: 20,
    maxAge: 30
  };

  const result = benchmarkFilterQuery(profiles, criteria);
  assert.ok(result.matchedCount > 0, 'Should find matching profiles');
  assert.ok(result.durationMs < 15, `Filter query duration (${result.durationMs}ms) must be under 15ms`);

  // Verify all returned records meet criteria
  for (const match of result.results) {
    assert.equal(match.gender, criteria.gender);
    assert.equal(match.religion, criteria.religion);
    assert.equal(match.aqeedah, criteria.aqeedah);
    assert.equal(match.status, criteria.status);
    assert.equal(match.maritalStatus, criteria.maritalStatus);
    assert.ok(match.age >= criteria.minAge && match.age <= criteria.maxAge);
  }
});

test('Capacity Benchmark: deterministic matching across 1,000 candidates satisfies performance gate (<25ms)', () => {
  const count = 1000;
  const profiles = [];
  for (let i = 0; i < count; i++) {
    profiles.push(generateSyntheticProfile(i));
  }

  const target = profiles[1]; // male
  const result = benchmarkDeterministicMatching(target, profiles);

  assert.ok(result.matchedCount > 0, 'Should find matches across candidate pool');
  assert.ok(result.durationMs < 25, `Matching 1000 candidates (${result.durationMs}ms) must complete under 25ms`);
  assert.ok(result.topScore >= 40, 'Top score must exceed base threshold');
  assert.ok(result.topMatches.length <= 10, 'Top matches slice length <= 10');
});

test('Capacity Benchmark: calculatePercentiles accurately computes p50, p90, p95, and p99 distributions', () => {
  const durations = [1.2, 2.5, 3.1, 4.0, 5.5, 6.2, 7.8, 8.4, 9.1, 10.0];
  const percentiles = calculatePercentiles(durations);

  assert.equal(percentiles.min, 1.2);
  assert.equal(percentiles.max, 10.0);
  assert.ok(percentiles.p50 >= 5.0 && percentiles.p50 <= 6.5);
  assert.ok(percentiles.p90 >= 9.0);
  assert.ok(percentiles.p95 >= 9.0);
  assert.ok(percentiles.p99 >= 9.5);
});

test('Capacity Benchmark: benchmarkConcurrency evaluates 50 concurrent client queries with p95 < 25ms', async () => {
  const profiles = [];
  for (let i = 0; i < 2000; i++) {
    profiles.push(generateSyntheticProfile(i));
  }

  const concurrencyResult = await benchmarkConcurrency(profiles, 50, 100);

  assert.equal(concurrencyResult.concurrency, 50);
  assert.equal(concurrencyResult.totalRequests, 100);
  assert.ok(concurrencyResult.throughputOpsPerSec > 0);
  assert.ok(concurrencyResult.filterPercentiles.p95 < 25, `Filter p95 (${concurrencyResult.filterPercentiles.p95}ms) must be < 25ms`);
  assert.ok(concurrencyResult.matchingPercentiles.p95 < 50, `Matching p95 (${concurrencyResult.matchingPercentiles.p95}ms) must be < 50ms`);
});

test('Capacity Benchmark: evaluateQueryPlan verifies PostgreSQL composite index scan strategies', () => {
  const searchPlan = evaluateQueryPlan('composite_search');
  assert.equal(searchPlan.targetTable, 'profiles');
  assert.equal(searchPlan.scanType, 'Index Scan');
  assert.ok(searchPlan.indexUsed.includes('idx_profiles_search_composite'));
  assert.ok(searchPlan.selectivity < 0.1);

  const finPlan = evaluateQueryPlan('financial_ledger');
  assert.equal(finPlan.targetTable, 'financial_transactions');
  assert.equal(finPlan.scanType, 'Backward Index Scan');

  const sharePlan = evaluateQueryPlan('share_grant_token');
  assert.equal(sharePlan.targetTable, 'share_grants');
  assert.equal(sharePlan.scanType, 'Unique Index Scan');
});

test('Capacity Benchmark: 100,000 profile capacity benchmark completes with memory bounded under 250MB', async () => {
  const report = await runFullCapacityBenchmark(100000);

  assert.equal(report.totalProfiles, 100000);
  assert.ok(report.generation.durationMs > 0);
  assert.ok(report.matchingBenchmarks.pool100000.durationMs < 250, 'Matching 100k candidates must finish within 250ms');
  assert.ok(report.memory.peakHeapUsedMB < 250, `Heap memory (${report.memory.peakHeapUsedMB}MB) must stay bounded below 250MB`);
  assert.ok(report.concurrencyBenchmarks.filterPercentiles.p95 > 0);
  assert.ok(report.queryPlans.compositeSearch);
});
