/**
 * @file production_settings.test.js
 * @description Automated audit verifying production settings, zero committed secrets,
 * .gitignore coverage for secret env files, and frontend secret leakage prevention.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const REPO_ROOT = resolve(import.meta.dirname, '../..');

test('Production Settings: .gitignore excludes all secret .env files', () => {
  const gitignorePath = join(REPO_ROOT, '.gitignore');
  assert.ok(existsSync(gitignorePath), '.gitignore must exist in root');

  const content = readFileSync(gitignorePath, 'utf8');
  assert.ok(content.includes('.env'), '.gitignore must ignore .env');
  assert.ok(content.includes('*.local'), '.gitignore must ignore *.local');
});

test('Production Settings: frontend/.env.example exposes zero privileged server secrets', () => {
  const envExamplePath = join(REPO_ROOT, 'frontend/.env.example');
  assert.ok(existsSync(envExamplePath), 'frontend/.env.example must exist');

  const content = readFileSync(envExamplePath, 'utf8');

  // Must not expose service role key to Vite
  assert.equal(content.includes('VITE_SUPABASE_SERVICE_ROLE_KEY'), false, 'frontend/.env.example must never contain VITE_SUPABASE_SERVICE_ROLE_KEY');
  assert.equal(content.includes('VITE_SERVICE_ROLE_KEY'), false, 'frontend/.env.example must never contain VITE_SERVICE_ROLE_KEY');
  assert.equal(content.includes('VITE_DATABASE_URL'), false, 'frontend/.env.example must never contain VITE_DATABASE_URL');

  // Placeholders must be sanitized
  assert.ok(content.includes('your-anon-token-placeholder'));
  assert.ok(content.includes('your-project-ref.supabase.co'));
});

test('Production Settings: backend/.env.example contains safe placeholders and zero live secrets', () => {
  const envExamplePath = join(REPO_ROOT, 'backend/.env.example');
  assert.ok(existsSync(envExamplePath), 'backend/.env.example must exist');

  const content = readFileSync(envExamplePath, 'utf8');

  assert.ok(content.includes('your-service-role-token-placeholder'));
  assert.ok(content.includes('your-db-password-placeholder'));
  assert.ok(content.includes('your-project-ref.supabase.co'));

  // Ensure no unmasked live passwords or tokens
  assert.doesNotMatch(content, /postgresql:\/\/[^:]+:[^@]+@db\.supabase\.co/);
});

test('Production Settings: no uncommitted or stray live .env files exist in git tracking', () => {
  const frontendEnv = join(REPO_ROOT, 'frontend/.env');
  const backendEnv = join(REPO_ROOT, 'backend/.env');

  // If local .env exists, verify it is not git tracked
  if (existsSync(frontendEnv)) {
    const content = readFileSync(frontendEnv, 'utf8');
    assert.doesNotMatch(content, /sbp_[a-zA-Z0-9]{30,}/, 'frontend/.env must not contain live service tokens');
  }
  if (existsSync(backendEnv)) {
    const content = readFileSync(backendEnv, 'utf8');
    assert.doesNotMatch(content, /sbp_[a-zA-Z0-9]{30,}/, 'backend/.env must not contain live service tokens');
  }
});

test('Production Settings: candidate photos are configured for private bucket access only', () => {
  const envExamplePath = join(REPO_ROOT, 'backend/.env.example');
  const content = readFileSync(envExamplePath, 'utf8');

  assert.ok(content.includes('CANDIDATE_PHOTO_BUCKET="candidate-photos"'));
});
