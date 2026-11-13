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
  mapDatabaseRoleToAppRole,
  fetchUserTrustedRole,
  buildSessionFromProvider,
  initAuth,
  resetAuthForTesting,
  AuthSession,
} from './auth';
import { setSupabaseClientForTesting, resetSupabaseClientForTesting, SupabaseClient } from './supabaseClient';

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

function createMockSupabase(options: {
  signInPasswordResponse?: { data: any; error: any };
  signInOtpResponse?: { error: any };
  getSessionResponse?: { data: { session: any }; error: any };
  userRolesResponse?: { data: any[] | null; error: any };
  signOutResponse?: { error: any };
}) {
  return {
    auth: {
      signInWithPassword: async () => options.signInPasswordResponse || { data: { user: null, session: null }, error: null },
      signInWithOtp: async () => options.signInOtpResponse || { error: null },
      getSession: async () => options.getSessionResponse || { data: { session: null }, error: null },
      signOut: async () => options.signOutResponse || { error: null },
      onAuthStateChange: (_cb: any) => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
    },
    from: (table: string) => ({
      select: (_cols: string) => ({
        eq: (col: string, _val: string) => {
          if (table === 'user_roles' && col === 'user_id') {
            return Promise.resolve(options.userRolesResponse || { data: [], error: null });
          }
          return Promise.resolve({ data: [], error: null });
        },
      }),
    }),
  } as unknown as SupabaseClient;
}

// -----------------------------------------------------------------------------
// Core Invariant & Boundary Tests
// -----------------------------------------------------------------------------

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

// -----------------------------------------------------------------------------
// Unconfigured Provider Fail-Closed Behavior
// -----------------------------------------------------------------------------

test('staff password sign-in fails closed when provider is unconfigured', async () => {
  resetSupabaseClientForTesting();
  resetAuthForTesting();

  const result = await signInWithPassword('nadeem@gulistan.pk', 'SecretPass123!');
  assert.equal(result.success, false);
  assert.equal(result.session, null);
  assert.equal(result.error?.code, 'AUTH_PROVIDER_NOT_CONFIGURED');
  assert.equal(getCurrentSession().isAuthenticated, false);
  assert.equal(getCurrentSession().role, 'public');
});

test('customer magic link fails closed when provider is unconfigured', async () => {
  resetSupabaseClientForTesting();
  resetAuthForTesting();

  const invalid = await sendMagicLink('not-an-email');
  assert.equal(invalid.success, false);
  assert.equal(invalid.error?.code, 'INVALID_EMAIL');

  const valid = await sendMagicLink('candidate@example.com');
  assert.equal(valid.success, false);
  assert.equal(valid.session, null);
  assert.equal(valid.error?.code, 'AUTH_PROVIDER_NOT_CONFIGURED');
  assert.equal(getCurrentSession().isAuthenticated, false);
});

// -----------------------------------------------------------------------------
// Trusted Role Mapping
// -----------------------------------------------------------------------------

test('mapDatabaseRoleToAppRole enforces hierarchy and returns null for unassigned roles', () => {
  assert.equal(mapDatabaseRoleToAppRole(['admin']), 'admin');
  assert.equal(mapDatabaseRoleToAppRole(['matchmaker']), 'nadeem');
  assert.equal(mapDatabaseRoleToAppRole(['customer']), 'customer');
  assert.equal(mapDatabaseRoleToAppRole(['customer', 'admin']), 'admin');
  assert.equal(mapDatabaseRoleToAppRole(['customer', 'matchmaker']), 'nadeem');
  assert.equal(mapDatabaseRoleToAppRole([]), null);
  assert.equal(mapDatabaseRoleToAppRole(['unknown_role', 'guest']), null);
});

// -----------------------------------------------------------------------------
// Provider Mocked Staff Authentication
// -----------------------------------------------------------------------------

test('signInWithPassword rejects missing credentials and invalid email format', async () => {
  const emptyRes = await signInWithPassword('', '');
  assert.equal(emptyRes.success, false);
  assert.equal(emptyRes.error?.code, 'MISSING_CREDENTIALS');

  const invalidRes = await signInWithPassword('bad-email', 'some-pass');
  assert.equal(invalidRes.success, false);
  assert.equal(invalidRes.error?.code, 'INVALID_EMAIL');
});

test('signInWithPassword handles provider credential failure and rate limits', async () => {
  // Credential error
  const mockCredError = createMockSupabase({
    signInPasswordResponse: {
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    },
  });
  setSupabaseClientForTesting(mockCredError);

  const credRes = await signInWithPassword('nadeem@gulistan.pk', 'WrongPassword');
  assert.equal(credRes.success, false);
  assert.equal(credRes.error?.code, 'INVALID_CREDENTIALS');

  // Rate limit
  const mockRateLimit = createMockSupabase({
    signInPasswordResponse: {
      data: { user: null, session: null },
      error: { message: 'rate limit exceeded' },
    },
  });
  setSupabaseClientForTesting(mockRateLimit);

  const rateRes = await signInWithPassword('nadeem@gulistan.pk', 'Pass123!');
  assert.equal(rateRes.success, false);
  assert.equal(rateRes.error?.code, 'RATE_LIMITED');

  resetSupabaseClientForTesting();
});

test('signInWithPassword succeeds with server-verified role and establishes session', async () => {
  resetAuthForTesting();
  const mockSuccess = createMockSupabase({
    signInPasswordResponse: {
      data: {
        user: {
          id: 'user-nadeem-uuid',
          email: 'nadeem@gulistan.pk',
          user_metadata: { full_name: 'Rao Nadeem' },
        },
        session: {
          access_token: 'valid-jwt-token-nadeem',
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        },
      },
      error: null,
    },
    userRolesResponse: {
      data: [{ role: 'matchmaker' }],
      error: null,
    },
  });
  setSupabaseClientForTesting(mockSuccess);

  const result = await signInWithPassword('nadeem@gulistan.pk', 'CorrectPass123!');
  assert.equal(result.success, true);
  assert.ok(result.session);
  assert.equal(result.session.isAuthenticated, true);
  assert.equal(result.session.role, 'nadeem');
  assert.equal(result.session.user?.email, 'nadeem@gulistan.pk');
  assert.equal(result.session.user?.displayName, 'Rao Nadeem');

  // Active session updated
  assert.equal(getCurrentSession().isAuthenticated, true);
  assert.equal(getCurrentSession().role, 'nadeem');

  resetSupabaseClientForTesting();
  resetAuthForTesting();
});

test('signInWithPassword fails closed if user has no assigned role in database', async () => {
  resetAuthForTesting();
  let signOutCalled = false;
  const mockNoRole = createMockSupabase({
    signInPasswordResponse: {
      data: {
        user: { id: 'orphan-user-uuid', email: 'orphan@example.com' },
        session: { access_token: 'valid-jwt-token', expires_at: Math.floor(Date.now() / 1000) + 3600 },
      },
      error: null,
    },
    userRolesResponse: {
      data: [], // No roles assigned
      error: null,
    },
    signOutResponse: {
      error: null,
    },
  });
  mockNoRole.auth.signOut = async () => {
    signOutCalled = true;
    return { error: null };
  };
  setSupabaseClientForTesting(mockNoRole);

  const result = await signInWithPassword('orphan@example.com', 'Pass123!');
  assert.equal(result.success, false);
  assert.equal(result.session, null);
  assert.equal(result.error?.code, 'ROLE_NOT_ASSIGNED');
  assert.equal(signOutCalled, true);
  assert.equal(getCurrentSession().isAuthenticated, false);

  resetSupabaseClientForTesting();
  resetAuthForTesting();
});

// -----------------------------------------------------------------------------
// Provider Mocked Magic Link (OTP)
// -----------------------------------------------------------------------------

test('sendMagicLink prohibits public signup and requires existing registered account', async () => {
  resetAuthForTesting();
  const mockAccountNotFound = createMockSupabase({
    signInOtpResponse: {
      error: { message: 'Signups not allowed for otp' },
    },
  });
  setSupabaseClientForTesting(mockAccountNotFound);

  const result = await sendMagicLink('unregistered@example.com');
  assert.equal(result.success, false);
  assert.equal(result.error?.code, 'ACCOUNT_NOT_FOUND');
  assert.equal(getCurrentSession().isAuthenticated, false);

  resetSupabaseClientForTesting();
  resetAuthForTesting();
});

test('sendMagicLink dispatches link successfully without creating premature session', async () => {
  resetAuthForTesting();
  const mockDispatchSuccess = createMockSupabase({
    signInOtpResponse: {
      error: null,
    },
  });
  setSupabaseClientForTesting(mockDispatchSuccess);

  const result = await sendMagicLink('registered-family@example.com');
  assert.equal(result.success, true);
  // Session must remain null until verified provider callback
  assert.equal(result.session, null);
  assert.equal(getCurrentSession().isAuthenticated, false);

  resetSupabaseClientForTesting();
  resetAuthForTesting();
});

// -----------------------------------------------------------------------------
// Lifecycle: initAuth, Sign Out, Subscribers
// -----------------------------------------------------------------------------

test('initAuth restores active session from provider with verified role', async () => {
  const mockActiveSession = createMockSupabase({
    getSessionResponse: {
      data: {
        session: {
          access_token: 'active-jwt-token',
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          user: {
            id: 'admin-uuid',
            email: 'admin@gulistan.pk',
            user_metadata: { full_name: 'System Administrator' },
          },
        },
      },
      error: null,
    },
    userRolesResponse: {
      data: [{ role: 'admin' }],
      error: null,
    },
  });
  setSupabaseClientForTesting(mockActiveSession);

  const session = await initAuth();
  assert.equal(session.isAuthenticated, true);
  assert.equal(session.role, 'admin');
  assert.equal(session.user?.email, 'admin@gulistan.pk');

  resetSupabaseClientForTesting();
});

test('signOut clears in-memory authentication state and calls provider signOut', async () => {
  let providerSignOutCalled = false;
  const mockSignOut = createMockSupabase({
    signOutResponse: { error: null },
  });
  mockSignOut.auth.signOut = async () => {
    providerSignOutCalled = true;
    return { error: null };
  };
  setSupabaseClientForTesting(mockSignOut);

  setSessionForTesting(makeSession('admin'));
  assert.equal(getCurrentSession().isAuthenticated, true);

  await signOut();
  assert.equal(providerSignOutCalled, true);
  const current = getCurrentSession();
  assert.equal(current.isAuthenticated, false);
  assert.equal(current.role, 'public');
  assert.equal(current.user, null);
  assert.equal(current.token, null);

  resetSupabaseClientForTesting();
});

test('authentication subscribers receive current state and sign-out changes', async () => {
  resetAuthForTesting();
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
