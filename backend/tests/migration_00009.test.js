/**
 * @file migration_00009.test.js
 * @description Automated verification of Migration 00009 (T-036):
 * - Follow-up reminder delivery model schema enhancements (P2-06)
 * - Customer self-service RLS policies on crm_follow_ups (P1-30, P1-31)
 * - Customer profile preferences update policy on profile_preferences (P1-17)
 * - Server RPC update_profile_preferences with owner/staff validation (P1-17)
 * - Server RPC get_customer_recommendations with privacy-filtered projection (P1-16)
 * - Zero mock or synthetic candidate data seeding
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const MIGRATION_PATH = resolve(import.meta.dirname, '../migrations/00009_customer_portal_and_crm_enhancements.sql');

test('Migration 00009 exists and is wrapped in a transaction block', () => {
  assert.ok(existsSync(MIGRATION_PATH), '00009_customer_portal_and_crm_enhancements.sql must exist');
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  const sqlWithoutLeadingComments = sql.replace(/^(\s*--[^\n]*\n)*/, '').trim();
  assert.ok(sqlWithoutLeadingComments.startsWith('BEGIN;'), 'Migration must start with BEGIN;');
  assert.ok(sql.trim().endsWith('COMMIT;'), 'Migration must end with COMMIT;');
});

test('Migration 00009 adds reminder delivery columns and channel constraints to crm_follow_ups (P2-06)', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  assert.ok(
    sql.includes('reminder_sent_at TIMESTAMPTZ NULL'),
    'Must add reminder_sent_at column to crm_follow_ups'
  );

  assert.ok(
    sql.includes("notification_channel VARCHAR(30) NOT NULL DEFAULT 'in_app'"),
    'Must add notification_channel column with in_app default'
  );

  assert.match(
    sql,
    /chk_followup_channel\s+CHECK\s*\(\s*notification_channel\s+IN\s*\('in_app',\s*'email',\s*'whatsapp',\s*'sms'\)\s*\)/i,
    'Must enforce valid notification channels (in_app, email, whatsapp, sms)'
  );

  assert.match(
    sql,
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_crm_follow_ups_reminders\s+ON\s+public\.crm_follow_ups\s*\(scheduled_date,\s*status,\s*reminder_sent_at\)/i,
    'Must index scheduled_date, status, and reminder_sent_at for reminder queries'
  );
});

test('Migration 00009 defines customer self-service RLS policies on crm_follow_ups (P1-30, P1-31)', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  assert.match(
    sql,
    /CREATE\s+POLICY\s+follow_ups_customer_insert\s+ON\s+public\.crm_follow_ups/i,
    'Must define customer insert policy on crm_follow_ups'
  );

  assert.ok(
    sql.includes("follow_up_type IN ('profile_correction', 'deactivation_request', 'photo_consent_change', 'customer_inquiry')"),
    'Customer follow-ups must be restricted to valid customer request types'
  );

  assert.match(
    sql,
    /CREATE\s+POLICY\s+follow_ups_customer_select\s+ON\s+public\.crm_follow_ups/i,
    'Must define customer select policy on crm_follow_ups for owned profiles'
  );
});

test('Migration 00009 allows active customers to update profile preferences (P1-17)', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  assert.match(
    sql,
    /CREATE\s+POLICY\s+prefs_customer_own_update\s+ON\s+public\.profile_preferences/i,
    'Must define customer update policy on profile_preferences'
  );

  assert.ok(
    sql.includes("p.status IN ('pending_review', 'active', 'introduction_authorized')"),
    'Must allow preference update for pending_review, active, or introduction_authorized profiles'
  );
});

test('Migration 00009 defines update_profile_preferences RPC with ownership and active check (P1-17)', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  assert.match(
    sql,
    /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.update_profile_preferences/i,
    'Must define update_profile_preferences RPC'
  );

  assert.ok(
    sql.includes('auth.uid()') && sql.includes('auth_is_account_active'),
    'update_profile_preferences must verify active caller account'
  );

  assert.ok(
    sql.includes('ON CONFLICT (profile_id) DO UPDATE SET'),
    'update_profile_preferences must atomically upsert preferences'
  );

  assert.ok(
    sql.includes('profile_preferences_updated'),
    'update_profile_preferences must log an audit event'
  );

  assert.ok(
    sql.includes('GRANT EXECUTE ON FUNCTION public.update_profile_preferences') &&
    sql.includes('REVOKE ALL ON FUNCTION public.update_profile_preferences'),
    'Must manage execution privileges on update_profile_preferences'
  );
});

test('Migration 00009 defines get_customer_recommendations RPC with privacy filtering (P1-16)', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  assert.match(
    sql,
    /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.get_customer_recommendations/i,
    'Must define get_customer_recommendations RPC'
  );

  assert.ok(
    sql.includes('auth.uid()') && sql.includes('auth_is_account_active'),
    'get_customer_recommendations must verify active caller account'
  );

  assert.ok(
    sql.includes("mc.status IN ('approved_by_nadeem', 'shared_with_parties', 'accepted_by_customer')"),
    'Must only return matches approved by Nadeem or customer'
  );

  assert.ok(
    sql.includes('other_p.display_name') &&
    sql.includes('other_p.education') &&
    sql.includes('other_p.current_city') &&
    !sql.includes('other_p.contact_phone') &&
    !sql.includes('other_p.contact_email'),
    'Must project sanitized candidate profile and scrub private contact phone/email'
  );

  assert.ok(
    sql.includes('GRANT EXECUTE ON FUNCTION public.get_customer_recommendations') &&
    sql.includes('REVOKE ALL ON FUNCTION public.get_customer_recommendations'),
    'Must manage execution privileges on get_customer_recommendations'
  );
});

test('Migration 00009 does not contain mock or production candidate data seeding', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  assert.doesNotMatch(
    sql,
    /INSERT\s+INTO\s+public\.profiles/i,
    'Migration 00009 must not seed profiles table'
  );

  assert.doesNotMatch(
    sql,
    /INSERT\s+INTO\s+public\.match_cases\s+VALUES/i,
    'Migration 00009 must not seed match_cases table'
  );
});
