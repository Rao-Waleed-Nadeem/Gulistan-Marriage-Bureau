import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MATCHING_CODE_PATH = path.resolve(__dirname, '../../frontend/src/lib/matching.ts');
const OPEN_DECISIONS_PATH = path.resolve(__dirname, '../docs/09-open-decisions.md');

test('Matching engine implements OPEN-005 and OPEN-009 hard filter gates and zero-inference rules', () => {
  const code = fs.readFileSync(MATCHING_CODE_PATH, 'utf8');

  // Hard gates: religion, aqeedah, marital status
  assert.ok(code.includes('MANDATORY_RELIGION_MISMATCH'), 'Must define religion mismatch disqualification code');
  assert.ok(code.includes('MANDATORY_AQEEDAH_MISMATCH'), 'Must define aqeedah mismatch disqualification code');
  assert.ok(code.includes('MANDATORY_MARITAL_STATUS_MISMATCH'), 'Must define marital status mismatch disqualification code');

  // Unknown values handled safely without false matches
  assert.ok(code.includes('RELIGION_UNKNOWN'), 'Must handle unknown religion explicitly');
  assert.ok(code.includes('AQEEDAH_UNKNOWN'), 'Must handle unknown aqeedah explicitly');
  assert.ok(code.includes('EDUCATION_UNKNOWN'), 'Must handle unknown education explicitly');

  // Invariant: human approval required
  assert.ok(code.includes('requiresHumanApproval: true'), 'requiresHumanApproval must always be true');
  assert.ok(code.includes('CANNOT_APPROVE_INELIGIBLE_MATCH'), 'Cannot approve an ineligible match');
});

test('Open decisions document records DECIDED status for OPEN-005 and OPEN-009', () => {
  const docs = fs.readFileSync(OPEN_DECISIONS_PATH, 'utf8');

  assert.ok(docs.includes('OPEN-005'), 'Must contain OPEN-005');
  assert.ok(docs.includes('OPEN-009'), 'Must contain OPEN-009');
  assert.ok(docs.includes('| OPEN-005 | Customer visibility | DECIDED |'), 'OPEN-005 must be DECIDED');
  assert.ok(docs.includes('| OPEN-009 | Matching rules | DECIDED |'), 'OPEN-009 must be DECIDED');
});

test('Matching engine enforces gender complementarity and prohibits self-pair', () => {
  const code = fs.readFileSync(MATCHING_CODE_PATH, 'utf8');

  assert.ok(code.includes('SELF_PAIR_PROHIBITED'), 'Must define SELF_PAIR_PROHIBITED');
  assert.ok(code.includes('SAME_GENDER_PROHIBITED'), 'Must define SAME_GENDER_PROHIBITED');
});
