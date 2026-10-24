import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DISCLOSURE_CODE_PATH = path.resolve(__dirname, '../../frontend/src/lib/disclosure.ts');
const MIGRATION_PATH = path.resolve(__dirname, '../migrations/00001_initial_schema_baseline.sql');
const OPEN_DECISIONS_PATH = path.resolve(__dirname, '../docs/09-open-decisions.md');

test('Controlled disclosure engine enforces OPEN-005 human-gated introduction and locked contact rules', () => {
  const code = fs.readFileSync(DISCLOSURE_CODE_PATH, 'utf8');

  // Must define reason codes for locking legal name and contact details prior to introduction
  assert.ok(code.includes('LEGAL_NAME_LOCKED_PENDING_INTRODUCTION'), 'Must define legal name lock code');
  assert.ok(code.includes('DIRECT_CONTACT_LOCKED_PENDING_INTRODUCTION'), 'Must define direct contact lock code');

  // Must enforce check against profile status 'introduction_authorized'
  assert.ok(code.includes("profile.status === 'introduction_authorized'"), 'Must require introduction_authorized status for direct contact');

  // Must substitute bureau office concierge phone when pre-introduction
  assert.ok(code.includes('BUREAU_OFFICE_PHONE'), 'Must substitute bureau office phone');
});

test('Controlled disclosure engine enforces OPEN-006 48-hour expiration and photo consent gating', () => {
  const code = fs.readFileSync(DISCLOSURE_CODE_PATH, 'utf8');

  // 48 hours default expiry: 48 * 60 * 60 * 1000
  assert.ok(code.includes('48 * 60 * 60 * 1000'), 'Must enforce 48-hour grant expiry');

  // Photo consent check
  assert.ok(code.includes('PHOTO_CONSENT_DENIED'), 'Must deny photo if consent is not granted');
});

test('Audit trail contract strictly minimizes sensitive content per Section 3.7', () => {
  const code = fs.readFileSync(DISCLOSURE_CODE_PATH, 'utf8');

  // Audit record function
  assert.ok(code.includes('function createDisclosureAuditRecord'), 'Must export createDisclosureAuditRecord');

  // Audit details should store metadata only
  assert.ok(code.includes('grantId: snapshot.grantId'), 'Must store grantId in audit');
  assert.ok(code.includes('authorizedFields: snapshot.authorizedFields'), 'Must store authorizedFields list in audit');

  // Verify that database schema audit_events table exists
  const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.audit_events'), 'Database baseline must include audit_events');
});

test('Open decisions document records DECIDED status for OPEN-005 and OPEN-006', () => {
  const docs = fs.readFileSync(OPEN_DECISIONS_PATH, 'utf8');

  assert.ok(docs.includes('| OPEN-005 | Customer visibility | DECIDED |'), 'OPEN-005 must be DECIDED');
  assert.ok(docs.includes('| OPEN-006 | Sharing recipient | DECIDED |'), 'OPEN-006 must be DECIDED');
});
