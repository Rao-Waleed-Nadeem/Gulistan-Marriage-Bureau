import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateSession,
  canAccessRole,
  signInWithPassword,
  sendMagicLink,
  signOut,
  getCurrentSession,
  setSessionForTesting,
  subscribeToAuthChanges,
  AuthSession,
} from './auth';

function makeSession(role: 'admin' | 'nadeem' | 'customer' = 'nadeem'): AuthSession {
  return {
    user: {
      id: 'test-user',
      email: 'test@example.com',
      displayName: 'Test User',
      role,
      preferredLanguage: 'en',
    },
    role,
    token: 'provider-test-token',
    expiresAt: Date.now() + 60_000,
    isAuthenticated: true,
  };
}

test('validateSession rejects null and unauthenticated sessions', () => {
  assert.deepEqual(validateSession(null), { valid: false, reason: 'missing' });
  assert.deepEqual(validateSession({
    user: null, role: 'public', token: null, expiresAt: null, isAuthenticated: false,
  }), { valid: false, reason: 'missing' });
});

test('validateSession rejects expired, tokenless, and role-inconsistent sessions', () => {
  const expired = makeSession();
  expired.expiresAt = Date.now() - 1;
  assert.deepEqual(validateSession(expired), { valid: false, reason: 'expired' });

  const tokenless = makeSession();
  tokenless.token = null;
  assert.deepEqual(validateSession(tokenless), { valid: false, reason: 'unauthenticated' });

  const inconsistent = makeSession('customer');
  inconsistent.role = 'admin';
  assert.deepEqual(validateSession(inconsistent), { valid: false, reason: 'unauthenticated' });
});

test('validateSession accepts a structurally valid, unexpired provider session', () => {
  assert.deepEqual(validateSession(makeSession()), { valid: true });
});

test('canAccessRole fails closed for protected routes without a session', () => {
  assert.equal(canAccessRole(null, 'public'), true);
  assert.equal(canAccessRole(null, 'customer'), false);
  assert.equal(canAccessRole(null, 'nadeem'), false);
  assert.equal(canAccessRole(null, 'admin'), false);
});

test('canAccessRole enforces role boundaries for a valid session', () => {
  const customer = makeSession('customer');
  assert.equal(canAccessRole(customer, 'customer'), true);
  assert.equal(canAccessRole(customer, 'nadeem'), false);
  assert.equal(canAccessRole(customer, 'admin'), false);

  const nadeem = makeSession('nadeem');
  assert.equal(canAccessRole(nadeem, 'customer'), true);
  assert.equal(canAccessRole(nadeem, 'nadeem'), true);
  assert.equal(canAccessRole(nadeem, 'admin'), false);

  const admin = makeSession('admin');
  assert.equal(canAccessRole(admin, 'admin'), true);
  assert.equal(canAccessRole(admin, 'nadeem'), true);
  assert.equal(canAccessRole(admin, 'customer'), true);
});

test('staff password sign-in never authenticates through demo credentials', async () => {
  await signOut();
  const result = await signInWithPassword('nadeem@gulistan.pk', 'Nadeem2026!');
  assert.equal(result.success, false);
  assert.equal(result.session, null);
  assert.equal(result.error?.code, 'AUTH_PROVIDER_NOT_CONFIGURED');
  assert.equal(getCurrentSession().isAuthenticated, false);
  assert.equal(getCurrentSession().role, 'public');
});

test('customer magic link never creates a session without provider verification', async () => {
  await signOut();

  const invalid = await sendMagicLink('not-an-email');
  assert.equal(invalid.success, false);
  assert.equal(invalid.error?.code, 'INVALID_EMAIL');

  const valid = await sendMagicLink('candidate@example.com');
  assert.equal(valid.success, false);
  assert.equal(valid.session, null);
  assert.equal(valid.error?.code, 'AUTH_PROVIDER_NOT_CONFIGURED');
  assert.equal(getCurrentSession().isAuthenticated, false);
});

test('signOut clears in-memory authentication state', async () => {
  setSessionForTesting(makeSession('admin'));
  assert.equal(getCurrentSession().isAuthenticated, true);

  await signOut();
  const current = getCurrentSession();
  assert.equal(current.isAuthenticated, false);
  assert.equal(current.role, 'public');
  assert.equal(current.user, null);
  assert.equal(current.token, null);
});

test('authentication subscribers receive current state and sign-out changes', async () => {
  await signOut();
  let callCount = 0;
  let lastSession: AuthSession | null = null;

  const unsubscribe = subscribeToAuthChanges((session) => {
    callCount++;
    lastSession = session;
  });

  assert.equal(callCount, 1);
  setSessionForTesting(makeSession('nadeem'));
  assert.equal(callCount, 2);
  assert.equal((lastSession as AuthSession | null)?.role, 'nadeem');

  unsubscribe();
  await signOut();
  assert.equal(callCount, 2);
});
