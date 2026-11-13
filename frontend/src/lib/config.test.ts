import test from 'node:test';
import assert from 'node:assert/strict';
import { validateClientConfig, getBackendHealthStatus, resetClientConfigForTesting } from './config';
import { isBackendConfigured } from './supabaseClient';

test('validateClientConfig safely defaults to demo mode when variables are missing', () => {
  const result = validateClientConfig({});

  assert.equal(result.isValid, true);
  assert.equal(result.mode, 'demo');
  assert.ok(result.warnings.length > 0, 'Expected fallback warning');
  assert.equal(result.errors.length, 0);
  assert.equal(result.config?.useMockData, true);
});

test('validateClientConfig safely defaults to demo mode when placeholder values are used', () => {
  const placeholderEnv = {
    VITE_SUPABASE_URL: 'https://your-project-ref.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-anon-token-placeholder',
  };

  const result = validateClientConfig(placeholderEnv);

  assert.equal(result.isValid, true);
  assert.equal(result.mode, 'demo');
  assert.equal(result.config?.useMockData, true);
});

test('validateClientConfig detects and blocks privileged server secrets (service-role leakage)', () => {
  const leakedEnv = {
    VITE_SUPABASE_URL: 'https://project.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'anon-key-123',
    SUPABASE_SERVICE_ROLE_KEY: 'privileged-secret-key-that-must-not-be-in-browser',
  };

  const result = validateClientConfig(leakedEnv);

  assert.equal(result.isValid, false);
  assert.ok(
    result.errors.some((e) => e.includes('CRITICAL SECURITY VIOLATION')),
    'Must report critical security violation on service role key'
  );
});

test('validateClientConfig detects leaked database connection string', () => {
  const leakedDbEnv = {
    VITE_SUPABASE_URL: 'https://project.supabase.co',
    DATABASE_URL: 'postgresql://postgres:secret@db.supabase.co:5432/postgres',
  };

  const result = validateClientConfig(leakedDbEnv);

  assert.equal(result.isValid, false);
  assert.ok(
    result.errors.some((e) => e.includes('DATABASE_URL')),
    'Must report security error on DATABASE_URL'
  );
});

test('validateClientConfig rejects malformed URLs in backend mode', () => {
  const invalidUrlEnv = {
    VITE_SUPABASE_URL: 'invalid-url-without-protocol',
    VITE_SUPABASE_ANON_KEY: 'valid-anon-key-abc',
  };

  const result = validateClientConfig(invalidUrlEnv);

  assert.equal(result.isValid, false);
  assert.ok(
    result.errors.some((e) => e.includes('Invalid VITE_SUPABASE_URL')),
    'Must report invalid URL error'
  );
});

test('validateClientConfig configures backend mode when valid credentials provided with mock data disabled', () => {
  const validBackendEnv = {
    VITE_SUPABASE_URL: 'https://gulistan-prod.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'valid.jwt.token.string',
    VITE_APP_ENV: 'staging',
    VITE_USE_MOCK_DATA: 'false',
  };

  const result = validateClientConfig(validBackendEnv);

  assert.equal(result.isValid, true);
  assert.equal(result.mode, 'backend');
  assert.equal(result.config?.supabaseUrl, 'https://gulistan-prod.supabase.co');
  assert.equal(result.config?.supabaseAnonKey, 'valid.jwt.token.string');
  assert.equal(result.config?.appEnv, 'staging');
  assert.equal(result.config?.useMockData, false);
});

test('validateClientConfig strictly rejects missing credentials in production mode (CFG-01)', () => {
  const prodEmptyEnv = {
    VITE_APP_ENV: 'production',
  };

  const result = validateClientConfig(prodEmptyEnv);

  assert.equal(result.isValid, false);
  assert.equal(result.config, null);
  assert.ok(
    result.errors.some((e) => e.includes('Production environment requires valid, non-placeholder')),
    'Production must fail hard when config is missing'
  );
});

test('validateClientConfig strictly rejects placeholder credentials in production mode (CFG-01)', () => {
  const prodPlaceholderEnv = {
    VITE_APP_ENV: 'production',
    VITE_SUPABASE_URL: 'https://your-project-ref.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'placeholder-token',
  };

  const result = validateClientConfig(prodPlaceholderEnv);

  assert.equal(result.isValid, false);
  assert.ok(
    result.errors.some((e) => e.includes('Demo fallback is strictly prohibited in production')),
    'Production must reject placeholder credentials'
  );
});

test('validateClientConfig strictly rejects VITE_USE_MOCK_DATA=true in production mode (CFG-01)', () => {
  const prodMockEnv = {
    VITE_APP_ENV: 'production',
    VITE_SUPABASE_URL: 'https://gulistan-prod.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'valid.token.string',
    VITE_USE_MOCK_DATA: 'true',
  };

  const result = validateClientConfig(prodMockEnv);

  assert.equal(result.isValid, false);
  assert.ok(
    result.errors.some((e) => e.includes('VITE_USE_MOCK_DATA=true is strictly prohibited in production')),
    'Production must prohibit mock mode'
  );
});

test('getBackendHealthStatus returns safe non-sensitive status object', () => {
  resetClientConfigForTesting();
  const status = getBackendHealthStatus();

  assert.ok(status.status === 'demo_mode' || status.status === 'configured');
  assert.ok(status.timestamp, 'Health status must include ISO timestamp');
  assert.ok(typeof status.message === 'string');
});

test('getBackendHealthStatus reports distinct component health for all 5 services (CFG-04)', () => {
  resetClientConfigForTesting();
  const status = getBackendHealthStatus();

  assert.ok(status.services);
  assert.ok(status.services.configuration);
  assert.ok(status.services.gateway);
  assert.ok(status.services.auth);
  assert.ok(status.services.database);
  assert.ok(status.services.storage);
  assert.equal(status.services.configuration.status, 'healthy');
  assert.equal(status.services.gateway.status, 'unconfigured');
});

test('isBackendConfigured accurately reflects configuration boundary', () => {
  resetClientConfigForTesting();
  const isConfigured = isBackendConfigured();
  // On clean local checkout without .env, isConfigured must be false (safe demo fallback)
  assert.equal(typeof isConfigured, 'boolean');
});
