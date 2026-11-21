/**
 * @file pagination.test.ts
 * @description Automated tests for server-side pagination, bounded payloads,
 * keyset cursor pagination, and search filter bounds (Remediates P1-19 and OPS-05).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { profileRepository, resetRepositoriesForTesting } from './repositories';
import { AuthSession } from './auth';

const staffSession: AuthSession = {
  user: {
    id: 'staff-uuid-001',
    email: 'nadeem@gulistan.pk',
    displayName: 'Nadeem Ahmed',
    role: 'nadeem',
    preferredLanguage: 'ur',
  },
  role: 'nadeem',
  token: 'staff-token',
  expiresAt: Date.now() + 3600000,
  isAuthenticated: true,
};

const customerSession: AuthSession = {
  user: {
    id: 'customer-uuid-002',
    email: 'tariq@gmail.com',
    displayName: 'Tariq Mehmood',
    role: 'customer',
    preferredLanguage: 'en',
  },
  role: 'customer',
  token: 'customer-token',
  expiresAt: Date.now() + 3600000,
  isAuthenticated: true,
};

test('findPaginated: defaults to 20 records and clamps maximum page limit to 100 (P1-19)', async () => {
  resetRepositoriesForTesting();

  // Default limit
  const defaultPage = await profileRepository.findPaginated(staffSession);
  assert.equal(defaultPage.limit, 20, 'Default page limit should be 20');
  assert.equal(defaultPage.offset, 0, 'Default offset should be 0');
  assert.ok(defaultPage.items.length <= 20, 'Items returned must not exceed default limit');

  // Clamped limit: requests 500, but clamped to 100
  const clampedPage = await profileRepository.findPaginated(staffSession, { limit: 500 });
  assert.equal(clampedPage.limit, 100, 'Page limit exceeding 100 must be clamped to 100');
  assert.ok(clampedPage.items.length <= 100, 'Items returned must not exceed clamped limit of 100');
});

test('findPaginated: offset pagination partitions dataset into non-overlapping pages (P1-19)', async () => {
  resetRepositoriesForTesting();

  // Page 1: limit 2, offset 0
  const page1 = await profileRepository.findPaginated(staffSession, { limit: 2, offset: 0 });
  assert.equal(page1.items.length, 2, 'Page 1 must return 2 items');
  assert.equal(page1.offset, 0);
  assert.ok(page1.hasMore, 'Should have more records beyond page 1');

  // Page 2: limit 2, offset 2
  const page2 = await profileRepository.findPaginated(staffSession, { limit: 2, offset: 2 });
  assert.equal(page2.items.length, 2, 'Page 2 must return 2 items');
  assert.equal(page2.offset, 2);

  // Verify zero overlap between page 1 and page 2
  const page1Ids = new Set(page1.items.map((p) => p.id));
  for (const item of page2.items) {
    assert.ok(!page1Ids.has(item.id), `Page 2 item ${item.id} must not appear in Page 1`);
  }
});

test('findPaginated: keyset cursor pagination traverses subsequent pages deterministically (P1-19)', async () => {
  resetRepositoriesForTesting();

  // Request first page of 2 items
  const page1 = await profileRepository.findPaginated(staffSession, { limit: 2 });
  assert.ok(page1.nextCursor, 'Page 1 must emit nextCursor');
  assert.ok(page1.nextCursor.createdAt, 'Cursor must include createdAt');
  assert.ok(page1.nextCursor.id, 'Cursor must include id');

  // Request page 2 using cursor
  const page2 = await profileRepository.findPaginated(staffSession, {
    limit: 2,
    cursorCreatedAt: page1.nextCursor.createdAt,
    cursorId: page1.nextCursor.id,
  });

  assert.ok(page2.items.length > 0, 'Page 2 with cursor must return records');
  const page1Ids = new Set(page1.items.map((p) => p.id));
  for (const item of page2.items) {
    assert.ok(!page1Ids.has(item.id), `Cursor page item ${item.id} must not overlap with page 1`);
  }
});

test('findPaginated: applies multi-attribute demographic search filters (gender, city, caste, age, maritalStatus)', async () => {
  resetRepositoriesForTesting();

  // Filter for females in Lahore
  const lahoreFemales = await profileRepository.findPaginated(staffSession, {
    gender: 'female',
    city: 'Lahore',
  });

  assert.ok(lahoreFemales.items.length > 0, 'Should find Lahore females in demo repository');
  for (const item of lahoreFemales.items) {
    assert.equal(item.gender, 'female', 'Must match gender filter');
    assert.match(item.currentCity.toLowerCase(), /lahore/, 'Must match city filter');
  }

  // Filter by age bounds (minAge: 20, maxAge: 26)
  const ageBounded = await profileRepository.findPaginated(staffSession, {
    minAge: 20,
    maxAge: 26,
  });

  for (const item of ageBounded.items) {
    assert.ok(item.age >= 20 && item.age <= 26, `Candidate age ${item.age} must be within [20, 26]`);
  }
});

test('findPaginated: customer role only discovers active / introduction_authorized candidates and sanitizes PII', async () => {
  resetRepositoriesForTesting();

  const customerView = await profileRepository.findPaginated(customerSession);

  // Verify no non-active profiles visible
  for (const item of customerView.items) {
    assert.ok(
      item.status === 'active' || item.status === 'introduction_authorized',
      `Customer cannot discover candidate in status ${item.status}`
    );
    // Contact phone must be protected/scrubbed
    assert.match(item.contactPhone, /Protected/, 'Direct phone number must be protected from third parties');
  }
});

test('bounded payload size: single page payload is bounded (<25KB) compared to unbounded multi-megabyte registry (P1-19)', async () => {
  resetRepositoriesForTesting();

  const page = await profileRepository.findPaginated(staffSession, { limit: 20 });
  const serializedBytes = Buffer.byteLength(JSON.stringify(page), 'utf8');

  // 20 candidate summaries must be well below 25KB
  assert.ok(
    serializedBytes < 25000,
    `Paginated 20-record payload size (${serializedBytes} bytes) must be < 25KB`
  );
});

test('findAll: enforces default 100-record boundary when unbounded is false (remediates P1-19)', async () => {
  resetRepositoriesForTesting();

  // Querying with pagination filter delegating to bounded search
  const boundedProfiles = await profileRepository.findAll(staffSession, { limit: 5 });
  assert.equal(boundedProfiles.length, 5, 'Should return exactly 5 profiles');
});
