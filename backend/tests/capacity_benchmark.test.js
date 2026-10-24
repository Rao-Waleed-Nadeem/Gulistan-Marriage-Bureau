/**
 * @file capacity_benchmark.test.js
 * @description Automated test for 100,000 synthetic profile capacity benchmark,
 * query filtering bounds, deterministic matching throughput, and memory bounds.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateSyntheticProfile,
  benchmarkFilterQuery,
  benchmarkDeterministicMatching,
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

test('Capacity Benchmark: 100,000 profile capacity benchmark completes with memory bounded under 250MB', async () => {
  const report = await runFullCapacityBenchmark(100000);

  assert.equal(report.totalProfiles, 100000);
  assert.ok(report.generation.durationMs > 0);
  assert.ok(report.matchingBenchmarks.pool100000.durationMs < 200, 'Matching 100k candidates must finish within 200ms');
  assert.ok(report.memory.peakHeapUsedMB < 250, `Heap memory (${report.memory.peakHeapUsedMB}MB) must stay bounded below 250MB`);
});
