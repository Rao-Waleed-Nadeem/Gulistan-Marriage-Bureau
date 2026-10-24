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
  DEFAULT_SESSION_DURATION_MS,
} from './auth';

test('validateSession rejects null, unauthenticated, or empty sessions', () => {
  assert.deepEqual(validateSession(null), { valid: false, reason: 'missing' });

  const unauthSession: AuthSession = {
    user: null,
    role: 'public',
    token: null,
    expiresAt: null,
    isAuthenticated: false,
  };
  assert.deepEqual(validateSession(unauthSession), { valid: false, reason: 'missing' });
});

test('validateSession detects and rejects expired sessions', () => {
  const expiredSession: AuthSession = {
    user: {
      id: 'usr-1',
      email: 'nadeem@gulistan.pk',
      displayName: 'Nadeem Ahmed',
      role: 'nadeem',
      preferredLanguage: 'ur',
    },
    role: 'nadeem',
    token: 'tok-expired',
    expiresAt: Date.now() - 5000, // Expired 5 seconds ago
    isAuthenticated: true,
  };

  assert.deepEqual(validateSession(expiredSession), { valid: false, reason: 'expired' });
});

test('validateSession accepts active, unexpired session', () => {
  const activeSession: AuthSession = {
    user: {
      id: 'usr-1',
      email: 'nadeem@gulistan.pk',
      displayName: 'Nadeem Ahmed',
      role: 'nadeem',
      preferredLanguage: 'ur',
    },
    role: 'nadeem',
    token: 'tok-valid',
    expiresAt: Date.now() + 60000,
    isAuthenticated: true,
  };

  assert.deepEqual(validateSession(activeSession), { valid: true });
});

test('canAccessRole allows public role unconditionally but fails closed for protected roles when unauthenticated', () => {
  assert.equal(canAccessRole(null, 'public'), true);

  // Protected roles must fail closed
  assert.equal(canAccessRole(null, 'nadeem'), false);
  assert.equal(canAccessRole(null, 'customer'), false);
  assert.equal(canAccessRole(null, 'admin'), false);
});

test('canAccessRole enforces strict role boundaries and fails closed across unauthorized tiers', () => {
  const customerSession: AuthSession = {
    user: {
      id: 'usr-cust',
      email: 'customer@example.com',
      displayName: 'Customer Fatima',
      role: 'customer',
      preferredLanguage: 'ur',
    },
    role: 'customer',
    token: 'tok-cust',
    expiresAt: Date.now() + 60000,
    isAuthenticated: true,
  };

  // Customer cannot access staff workspaces
  assert.equal(canAccessRole(customerSession, 'public'), true);
  assert.equal(canAccessRole(customerSession, 'customer'), true);
  assert.equal(canAccessRole(customerSession, 'nadeem'), false);
  assert.equal(canAccessRole(customerSession, 'admin'), false);

  const nadeemSession: AuthSession = {
    user: {
      id: 'usr-nad',
      email: 'nadeem@gulistan.pk',
      displayName: 'Nadeem Ahmed',
      role: 'nadeem',
      preferredLanguage: 'ur',
    },
    role: 'nadeem',
    token: 'tok-nad',
    expiresAt: Date.now() + 60000,
    isAuthenticated: true,
  };

  // Nadeem can view customer and matchmaker views, but cannot access administrative oversight
  assert.equal(canAccessRole(nadeemSession, 'public'), true);
  assert.equal(canAccessRole(nadeemSession, 'customer'), true);
  assert.equal(canAccessRole(nadeemSession, 'nadeem'), true);
  assert.equal(canAccessRole(nadeemSession, 'admin'), false);

  const adminSession: AuthSession = {
    user: {
      id: 'usr-adm',
      email: 'admin@gulistan.pk',
      displayName: 'Admin Officer',
      role: 'admin',
      preferredLanguage: 'en',
    },
    role: 'admin',
    token: 'tok-adm',
    expiresAt: Date.now() + 60000,
    isAuthenticated: true,
  };

  // Admin has overarching system oversight
  assert.equal(canAccessRole(adminSession, 'public'), true);
  assert.equal(canAccessRole(adminSession, 'customer'), true);
  assert.equal(canAccessRole(adminSession, 'nadeem'), true);
  assert.equal(canAccessRole(adminSession, 'admin'), true);
});

test('canAccessRole fails closed if an authenticated session has expired', () => {
  const expiredAdminSession: AuthSession = {
    user: {
      id: 'usr-adm',
      email: 'admin@gulistan.pk',
      displayName: 'Admin Officer',
      role: 'admin',
      preferredLanguage: 'en',
    },
    role: 'admin',
    token: 'tok-adm',
    expiresAt: Date.now() - 1000,
    isAuthenticated: true,
  };

  assert.equal(canAccessRole(expiredAdminSession, 'admin'), false);
  assert.equal(canAccessRole(expiredAdminSession, 'nadeem'), false);
  assert.equal(canAccessRole(expiredAdminSession, 'customer'), false);
  assert.equal(canAccessRole(expiredAdminSession, 'public'), true);
});

test('signInWithPassword validates inputs and rejects invalid credentials with bilingual messages', async () => {
  // Missing fields
  const missingRes = await signInWithPassword('', '');
  assert.equal(missingRes.success, false);
  assert.equal(missingRes.error?.code, 'MISSING_CREDENTIALS');
  assert.ok(missingRes.error?.messageEn.length > 0);
  assert.ok(missingRes.error?.messageUrdu.length > 0);

  // Malformed email
  const malformedRes = await signInWithPassword('not-an-email', 'password123');
  assert.equal(malformedRes.success, false);
  assert.equal(malformedRes.error?.code, 'INVALID_EMAIL');

  // Wrong password
  const badCreds = await signInWithPassword('nadeem@gulistan.pk', 'WrongPassword!');
  assert.equal(badCreds.success, false);
  assert.equal(badCreds.error?.code, 'INVALID_CREDENTIALS');
});

test('signInWithPassword authenticates staff and creates a timed session', async () => {
  const res = await signInWithPassword('nadeem@gulistan.pk', 'Nadeem2026!');
  assert.equal(res.success, true);
  assert.ok(res.session);
  assert.equal(res.session?.role, 'nadeem');
  assert.equal(res.session?.user?.email, 'nadeem@gulistan.pk');
  assert.ok(res.session?.expiresAt && res.session.expiresAt > Date.now());

  const current = getCurrentSession();
  assert.equal(current.isAuthenticated, true);
  assert.equal(current.role, 'nadeem');
});

test('sendMagicLink validates candidate email and creates customer session', async () => {
  // Invalid email
  const invalid = await sendMagicLink('invalid-email');
  assert.equal(invalid.success, false);
  assert.equal(invalid.error?.code, 'INVALID_EMAIL');

  // Valid candidate email
  const valid = await sendMagicLink('fatima.candidate@example.com');
  assert.equal(valid.success, true);
  assert.ok(valid.session);
  assert.equal(valid.session?.role, 'customer');
  assert.equal(valid.session?.user?.email, 'fatima.candidate@example.com');
});

test('signOut terminates session and resets to unauthenticated public state', async () => {
  // Ensure we are signed in first
  await signInWithPassword('admin@gulistan.pk', 'Admin2026!');
  assert.equal(getCurrentSession().isAuthenticated, true);

  // Sign out
  await signOut();
  const sessionAfter = getCurrentSession();
  assert.equal(sessionAfter.isAuthenticated, false);
  assert.equal(sessionAfter.role, 'public');
  assert.equal(sessionAfter.user, null);
  assert.equal(sessionAfter.token, null);
});

test('subscribeToAuthChanges notifies on changes and unsubscribes cleanly', async () => {
  let callCount = 0;
  let lastSession: AuthSession | null = null;

  const unsubscribe = subscribeToAuthChanges((s) => {
    callCount++;
    lastSession = s;
  });

  // Initial subscription emits current session immediately
  assert.equal(callCount, 1);

  // Trigger login
  await signInWithPassword('nadeem@gulistan.pk', 'Nadeem2026!');
  assert.equal(callCount, 2);
  assert.equal((lastSession as AuthSession | null)?.role, 'nadeem');

  // Unsubscribe
  unsubscribe();

  // Sign out should not notify unsubscribed listener
  await signOut();
  assert.equal(callCount, 2);
});
