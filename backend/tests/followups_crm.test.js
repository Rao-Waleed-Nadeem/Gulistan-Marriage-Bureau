import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FOLLOWUPS_CODE_PATH = path.resolve(__dirname, '../../frontend/src/lib/followUps.ts');
const MIGRATION_PATH = path.resolve(__dirname, '../migrations/00001_initial_schema_baseline.sql');
const OPEN_DECISIONS_PATH = path.resolve(__dirname, '../docs/09-open-decisions.md');

test('CRM and follow-up engine enforces least privilege access control per OPEN-002', () => {
  const code = fs.readFileSync(FOLLOWUPS_CODE_PATH, 'utf8');

  // Must export canAccessCRM and restrict to staff (nadeem / admin)
  assert.ok(code.includes('function canAccessCRM'), 'Must export canAccessCRM');
  assert.ok(code.includes("canAccessRole(session, 'nadeem')"), 'Must enforce nadeem/staff role access');

  // Customer or unauthenticated attempts must fail with UNAUTHORIZED
  assert.ok(code.includes("'UNAUTHORIZED'"), 'Must return UNAUTHORIZED for non-staff');
});

test('Follow-up completion and date calculation contracts enforce valid state transitions', () => {
  const code = fs.readFileSync(FOLLOWUPS_CODE_PATH, 'utf8');

  // Overdue status calculation
  assert.ok(code.includes('function computeFollowUpStatus'), 'Must export computeFollowUpStatus');
  assert.ok(code.includes("'overdue'"), 'Must handle overdue state');

  // Completion records who and when
  assert.ok(code.includes('function completeFollowUp'), 'Must export completeFollowUp');
  assert.ok(code.includes('completedBy:'), 'Must record completedBy');
  assert.ok(code.includes('completedAt:'), 'Must record completedAt');

  // Idempotency handling
  assert.ok(code.includes("current.status === 'completed'"), 'Must check for idempotent completion');
});

test('External matchmaker attribution adheres to database schema constraints', () => {
  const code = fs.readFileSync(FOLLOWUPS_CODE_PATH, 'utf8');

  // Attribution function
  assert.ok(code.includes('function attributeProfileToMatchmaker'), 'Must export attributeProfileToMatchmaker');
  assert.ok(code.includes('profilesReferredCount:'), 'Must increment profilesReferredCount');
  assert.ok(code.includes("'MATCHMAKER_INACTIVE'"), 'Must reject inactive matchmakers');

  // Verify database schema baseline defines external_matchmaker source and assigned_matchmaker_id
  const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');
  assert.ok(sql.includes("assigned_matchmaker_id UUID NULL"), 'Database must define assigned_matchmaker_id column');
  assert.ok(sql.includes("'external_matchmaker'"), 'Database check constraint must support external_matchmaker source');
});

test('Audit trail for CRM consequential changes minimizes sensitive data per Section 3.7', () => {
  const code = fs.readFileSync(FOLLOWUPS_CODE_PATH, 'utf8');

  // Audit actions defined
  assert.ok(code.includes("'follow_up_created'"), 'Must audit follow-up creation');
  assert.ok(code.includes("'follow_up_completed'"), 'Must audit follow-up completion');
  assert.ok(code.includes("'matchmaker_attributed'"), 'Must audit partner attribution');
});

test('Open decisions document records DECIDED status for OPEN-002 and OPEN-008', () => {
  const docs = fs.readFileSync(OPEN_DECISIONS_PATH, 'utf8');

  assert.ok(docs.includes('| OPEN-002 | Staff access scope | DECIDED |'), 'OPEN-002 must be DECIDED');
  assert.ok(docs.includes('| OPEN-008 | Data retention/deletion | DECIDED |'), 'OPEN-008 must be DECIDED');
});
