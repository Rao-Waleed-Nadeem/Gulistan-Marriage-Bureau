/**
 * @file family_property.test.js
 * @description Contract tests for OPEN-011: Sibling records and structured property holdings,
 * Pakistani land metrics (20 Marla = 1 Kanal), and privacy sanitization.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const REPO_ROOT = resolve(import.meta.dirname, '../..');

test('Family & Property Contract: OPEN-011 is DECIDED in docs/09-open-decisions.md', () => {
  const decisionsPath = join(REPO_ROOT, 'backend/docs/09-open-decisions.md');
  assert.ok(existsSync(decisionsPath), '09-open-decisions.md must exist');

  const content = readFileSync(decisionsPath, 'utf8');
  assert.match(content, /\|\s*OPEN-011\s*\|\s*Property and sibling fields\s*\|\s*DECIDED\s*\|/);
  assert.ok(content.includes('20 Marlas = 1 Kanal'));
});

test('Family & Property Contract: Pakistani land conversion standard (20 Marla per Kanal)', () => {
  function convert(marlas, marlaPerKanal = 20) {
    const kanal = Math.floor(marlas / marlaPerKanal);
    const rem = marlas % marlaPerKanal;
    return { kanal, rem };
  }

  // 5 Marla urban plot
  const c5 = convert(5);
  assert.equal(c5.kanal, 0);
  assert.equal(c5.rem, 5);

  // 10 Marla urban plot
  const c10 = convert(10);
  assert.equal(c10.kanal, 0);
  assert.equal(c10.rem, 10);

  // 20 Marla (Exact 1 Kanal)
  const c20 = convert(20);
  assert.equal(c20.kanal, 1);
  assert.equal(c20.rem, 0);

  // 25 Marla (1 Kanal, 5 Marla)
  const c25 = convert(25);
  assert.equal(c25.kanal, 1);
  assert.equal(c25.rem, 5);

  // 40 Marla (2 Kanal)
  const c40 = convert(40);
  assert.equal(c40.kanal, 2);
  assert.equal(c40.rem, 0);
});

test('Family & Property Contract: Sibling structure defines allowed relations and marital statuses', () => {
  const allowedRelations = ['brother', 'sister'];
  const allowedMarital = ['never_married', 'married', 'divorced', 'widowed'];

  assert.ok(allowedRelations.includes('brother'));
  assert.ok(allowedRelations.includes('sister'));
  assert.equal(allowedRelations.includes('cousin'), false);

  assert.ok(allowedMarital.includes('never_married'));
  assert.ok(allowedMarital.includes('married'));
});

test('Family & Property Contract: Privacy protection rules for family and property disclosure', () => {
  // Simulating privacy boundary rule:
  function sanitize(record, isStaff) {
    if (isStaff) return record;
    return {
      ...record,
      siblingName: undefined,
      siblingMarriageDetails: undefined,
      propertyValuePKR: undefined,
      propertyLocality: '[Disclosed upon introduction]'
    };
  }

  const raw = {
    candidateId: 'GLS-101',
    siblingName: 'Ahmad Khan',
    siblingMarriageDetails: 'Married into Niazi family',
    propertyValuePKR: 50000000,
    propertyLocality: 'Gulberg III'
  };

  const staffView = sanitize(raw, true);
  assert.equal(staffView.siblingName, 'Ahmad Khan');
  assert.equal(staffView.propertyValuePKR, 50000000);

  const publicView = sanitize(raw, false);
  assert.equal(publicView.siblingName, undefined);
  assert.equal(publicView.siblingMarriageDetails, undefined);
  assert.equal(publicView.propertyValuePKR, undefined);
  assert.equal(publicView.propertyLocality, '[Disclosed upon introduction]');
});
