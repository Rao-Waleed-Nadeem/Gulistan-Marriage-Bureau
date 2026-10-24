/**
 * @file capacity-benchmark.js
 * @description Benchmark harness for 100,000 synthetic profiles simulating
 * realistic Pakistani demographic distributions, filter indexes, deterministic matching,
 * and memory utilization per Section 7.2 of 07-testing-release-operations.md.
 */

import { performance } from 'node:perf_hooks';

// Synthetic demographic distributions
const CITIES = ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Gujranwala', 'Sialkot', 'Peshawar', 'Quetta'];
const CASTES = ['Rajput', 'Arain', 'Jatt', 'Syed', 'Sheikh', 'Gujjar', 'Mughal', 'Malik', 'Qureshi', 'Ansari'];
const RELIGIONS = ['islam', 'islam', 'islam', 'islam', 'christianity', 'hinduism'];
const AQEEDAHS = ['sunni', 'sunni', 'sunni', 'shia', 'ahle_hadith', 'other'];
const MARITAL_STATUSES = ['never_married', 'never_married', 'never_married', 'divorced', 'widowed'];
const EDUCATIONS = ['bachelors', 'masters', 'doctorate', 'intermediate', 'matric'];

/**
 * Generates a synthetic candidate profile with deterministic Pakistani demographics.
 * @param {number} id
 * @returns {object}
 */
export function generateSyntheticProfile(id) {
  const gender = id % 2 === 0 ? 'female' : 'male';
  const age = 20 + (id % 35); // 20 to 54
  const city = CITIES[id % CITIES.length];
  const caste = CASTES[id % CASTES.length];
  const religion = RELIGIONS[id % RELIGIONS.length];
  const aqeedah = AQEEDAHS[id % AQEEDAHS.length];
  const maritalStatus = MARITAL_STATUSES[id % MARITAL_STATUSES.length];
  const education = EDUCATIONS[id % EDUCATIONS.length];
  const monthlyIncome = 50000 + ((id * 31) % 450000); // 50k - 500k PKR

  return {
    id: `syn-prof-${id.toString().padStart(6, '0')}`,
    gender,
    age,
    city,
    caste,
    religion,
    aqeedah,
    maritalStatus,
    education,
    monthlyIncome,
    status: id % 10 === 0 ? 'pending_review' : 'active',
    partnerPreferences: {
      minAge: gender === 'female' ? age : Math.max(18, age - 5),
      maxAge: gender === 'female' ? age + 8 : age,
      preferredCities: [city, CITIES[(id + 1) % CITIES.length]],
      allowedCastes: [caste, CASTES[(id + 1) % CASTES.length]],
      requiredReligion: religion,
      requiredAqeedah: aqeedah,
      allowedMaritalStatuses: [maritalStatus]
    }
  };
}

/**
 * Simulates indexed query filter on in-memory profiles.
 * Corresponds to composite PostgreSQL index: (gender, religion, aqeedah, status, marital_status)
 */
export function benchmarkFilterQuery(profiles, criteria) {
  const start = performance.now();
  const results = [];

  for (let i = 0; i < profiles.length; i++) {
    const p = profiles[i];
    if (p.gender !== criteria.gender) continue;
    if (p.religion !== criteria.religion) continue;
    if (p.aqeedah !== criteria.aqeedah) continue;
    if (p.status !== criteria.status) continue;
    if (p.maritalStatus !== criteria.maritalStatus) continue;
    if (p.age < criteria.minAge || p.age > criteria.maxAge) continue;
    results.push(p);
  }

  const durationMs = performance.now() - start;
  return {
    matchedCount: results.length,
    durationMs,
    results
  };
}

/**
 * Benchmarks deterministic matching algorithm scoring over candidate pool.
 */
export function benchmarkDeterministicMatching(targetProfile, candidates) {
  const start = performance.now();
  const scored = [];

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    // Self-exclusion
    if (candidate.id === targetProfile.id) continue;

    // Hard Gate 1: Gender Complementarity
    if (candidate.gender === targetProfile.gender) continue;

    // Hard Gate 2: Religion
    if (candidate.religion !== targetProfile.partnerPreferences.requiredReligion) continue;

    // Hard Gate 3: Aqeedah
    if (candidate.aqeedah !== targetProfile.partnerPreferences.requiredAqeedah) continue;

    // Hard Gate 4: Marital Status
    if (!targetProfile.partnerPreferences.allowedMaritalStatuses.includes(candidate.maritalStatus)) continue;

    // Soft criteria scoring
    let score = 40; // Base hard-gates passed score

    // Age compatibility (max 25)
    if (candidate.age >= targetProfile.partnerPreferences.minAge && candidate.age <= targetProfile.partnerPreferences.maxAge) {
      score += 25;
    } else if (Math.abs(candidate.age - targetProfile.partnerPreferences.minAge) <= 2 || Math.abs(candidate.age - targetProfile.partnerPreferences.maxAge) <= 2) {
      score += 15;
    }

    // City compatibility (max 15)
    if (targetProfile.partnerPreferences.preferredCities.includes(candidate.city)) {
      score += 15;
    }

    // Caste compatibility (max 10)
    if (targetProfile.partnerPreferences.allowedCastes.includes(candidate.caste)) {
      score += 10;
    }

    // Education compatibility (max 10)
    if (candidate.education === 'masters' || candidate.education === 'doctorate') {
      score += 10;
    } else {
      score += 5;
    }

    scored.push({ id: candidate.id, score });
  }

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  const durationMs = performance.now() - start;
  return {
    evaluatedCount: candidates.length,
    matchedCount: scored.length,
    topScore: scored.length > 0 ? scored[0].score : 0,
    durationMs,
    topMatches: scored.slice(0, 10)
  };
}

/**
 * Runs full 100,000 synthetic profile capacity benchmark.
 */
export async function runFullCapacityBenchmark(totalProfiles = 100000) {
  const initialMem = process.memoryUsage();
  const genStart = performance.now();

  const profiles = new Array(totalProfiles);
  for (let i = 0; i < totalProfiles; i++) {
    profiles[i] = generateSyntheticProfile(i);
  }
  const genDurationMs = performance.now() - genStart;
  const postGenMem = process.memoryUsage();

  // Benchmark 1: Filter Index Query on 100,000 rows
  const queryCriteria = {
    gender: 'female',
    religion: 'islam',
    aqeedah: 'sunni',
    status: 'active',
    maritalStatus: 'never_married',
    minAge: 22,
    maxAge: 28
  };
  const filterBench = benchmarkFilterQuery(profiles, queryCriteria);

  // Benchmark 2: Deterministic Matching against 1,000 candidates
  const targetCandidate = profiles[1]; // male, age 21, Sunni, Lahore
  const subset1000 = profiles.slice(0, 1000);
  const matchBench1000 = benchmarkDeterministicMatching(targetCandidate, subset1000);

  // Benchmark 3: Deterministic Matching against 10,000 candidates
  const subset10000 = profiles.slice(0, 10000);
  const matchBench10000 = benchmarkDeterministicMatching(targetCandidate, subset10000);

  // Benchmark 4: Deterministic Matching against all 100,000 candidates
  const matchBench100000 = benchmarkDeterministicMatching(targetCandidate, profiles);

  const finalMem = process.memoryUsage();

  const report = {
    totalProfiles,
    generation: {
      durationMs: genDurationMs,
      throughputPerSec: Math.round((totalProfiles / (genDurationMs / 1000))),
      memoryUsedMB: Math.round((postGenMem.heapUsed - initialMem.heapUsed) / (1024 * 1024))
    },
    filterIndexBenchmark: {
      criteria: queryCriteria,
      scannedProfiles: totalProfiles,
      matchedProfiles: filterBench.matchedCount,
      durationMs: Number(filterBench.durationMs.toFixed(3)),
      throughputPerSec: Math.round((totalProfiles / (filterBench.durationMs / 1000)))
    },
    matchingBenchmarks: {
      pool1000: {
        poolSize: 1000,
        matches: matchBench1000.matchedCount,
        durationMs: Number(matchBench1000.durationMs.toFixed(3)),
        topScore: matchBench1000.topScore
      },
      pool10000: {
        poolSize: 10000,
        matches: matchBench10000.matchedCount,
        durationMs: Number(matchBench10000.durationMs.toFixed(3)),
        topScore: matchBench10000.topScore
      },
      pool100000: {
        poolSize: 100000,
        matches: matchBench100000.matchedCount,
        durationMs: Number(matchBench100000.durationMs.toFixed(3)),
        topScore: matchBench100000.topScore
      }
    },
    memory: {
      initialHeapUsedMB: Math.round(initialMem.heapUsed / (1024 * 1024)),
      peakHeapUsedMB: Math.round(finalMem.heapUsed / (1024 * 1024)),
      rssMB: Math.round(finalMem.rss / (1024 * 1024))
    }
  };

  return report;
}

// Direct CLI execution
if (process.argv[1] && process.argv[1].endsWith('capacity-benchmark.js')) {
  console.log('=== Running Gulistan Capacity Benchmark (100,000 Synthetic Profiles) ===');
  runFullCapacityBenchmark(100000).then(report => {
    console.log(JSON.stringify(report, null, 2));
    console.log('=== Benchmark Complete ===');
  }).catch(err => {
    console.error('Benchmark failed:', err);
    process.exit(1);
  });
}
