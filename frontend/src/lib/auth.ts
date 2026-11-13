/**
 * Authentication Boundary & Supabase Auth Integration — Gulistan Marriage Bureau.
 *
 * ARCHITECTURAL & SECURITY INVARIANTS:
 * 1. Supabase Auth is the identity provider (GMB-DEC-001).
 * 2. Staff authenticate with email and password via supabase.auth.signInWithPassword.
 * 3. Candidate families authenticate with verified email magic links (OTP links).
 * 4. Magic-link dispatch enforces `shouldCreateUser: false` to prohibit unapproved
 *    public self-service registration.
 * 5. A magic link dispatch never establishes a session; session establishment only
 *    occurs upon verified callback from the provider.
 * 6. Trusted application roles are fetched exclusively from public.user_roles in PostgreSQL.
 *    Client metadata, local storage, URL parameters, or request payloads NEVER grant roles.
 * 7. When provider configuration is missing, invalid, or placeholder, authentication
 *    fails closed with AUTH_PROVIDER_NOT_CONFIGURED.
 * 8. UI role checks are navigation safeguards only; backend RLS enforces authorization.
 */

import { Role } from '../types';
import { getSupabaseClient } from './supabaseClient';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  preferredLanguage: 'en' | 'ur';
}

export interface AuthSession {
  user: AuthUser | null;
  role: Role;
  token: string | null;
  expiresAt: number | null;
  isAuthenticated: boolean;
}

export interface AuthResult {
  success: boolean;
  session: AuthSession | null;
  error?: {
    code: string;
    messageEn: string;
    messageUrdu: string;
  };
}

const LEGACY_SESSION_STORAGE_KEY = 'gulistan_auth_session';
export const DEFAULT_SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

function unauthenticatedSession(): AuthSession {
  return {
    user: null,
    role: 'public',
    token: null,
    expiresAt: null,
    isAuthenticated: false,
  };
}

/**
 * Remove legacy demo sessions. Browser storage is never accepted as proof of identity.
 */
function initSession(): AuthSession {
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage?.removeItem(LEGACY_SESSION_STORAGE_KEY);
    } catch {
      // Storage unavailable; fails closed
    }
  }
  return unauthenticatedSession();
}

let currentSession: AuthSession = initSession();
let isListenerRegistered = false;

type SessionListener = (session: AuthSession) => void;
const listeners = new Set<SessionListener>();

export function subscribeToAuthChanges(listener: SessionListener): () => void {
  listeners.add(listener);
  listener({ ...currentSession });
  return () => listeners.delete(listener);
}

function notifyListeners(): void {
  for (const listener of listeners) {
    try {
      listener({ ...currentSession });
    } catch (err) {
      console.error('[Gulistan Auth] Error in session listener:', err);
    }
  }
}

function setSessionInMemory(session: AuthSession): void {
  currentSession = session;
  notifyListeners();
}

/**
 * Validates structural and temporal session invariants.
 */
export function validateSession(session: AuthSession | null): {
  valid: boolean;
  reason?: 'missing' | 'expired' | 'unauthenticated';
} {
  if (!session || !session.isAuthenticated || !session.user) {
    return { valid: false, reason: 'missing' };
  }

  if (!session.token || !session.expiresAt || session.role !== session.user.role) {
    return { valid: false, reason: 'unauthenticated' };
  }

  if (Date.now() >= session.expiresAt) {
    return { valid: false, reason: 'expired' };
  }

  return { valid: true };
}

/**
 * Client-side navigation guard only.
 * Database Row-Level Security (RLS) is mandatory for data protection.
 */
export function canAccessRole(session: AuthSession | null, targetRole: Role): boolean {
  if (targetRole === 'public') return true;

  const validation = validateSession(session);
  if (!validation.valid || !session?.user) return false;

  const userRole = session.user.role;
  switch (targetRole) {
    case 'admin':
      return userRole === 'admin';
    case 'nadeem':
      return userRole === 'nadeem' || userRole === 'admin';
    case 'customer':
      return userRole === 'customer' || userRole === 'nadeem' || userRole === 'admin';
    default:
      return false;
  }
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function providerUnavailableError(): AuthResult['error'] {
  return {
    code: 'AUTH_PROVIDER_NOT_CONFIGURED',
    messageEn: 'Sign-in is temporarily unavailable because verified authentication has not been configured. No account was signed in.',
    messageUrdu: 'تصدیق شدہ لاگ اِن سروس ابھی ترتیب نہیں دی گئی۔ کوئی اکاؤنٹ لاگ اِن نہیں کیا گیا۔',
  };
}

/**
 * Maps trusted database roles from public.user_roles to application roles.
 * Order of precedence: admin -> nadeem (matchmaker) -> customer.
 * Fails closed (returns null) if no authorized role is present.
 */
export function mapDatabaseRoleToAppRole(dbRoles: string[]): Role | null {
  if (dbRoles.includes('admin')) return 'admin';
  if (dbRoles.includes('matchmaker')) return 'nadeem';
  if (dbRoles.includes('customer')) return 'customer';
  return null;
}

/**
 * Fetches trusted application roles for a user ID from PostgreSQL public.user_roles.
 * Never trusts user_metadata or request payloads.
 */
export async function fetchUserTrustedRole(userId: string): Promise<Role | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (error || !data || data.length === 0) {
      return null;
    }

    const roles = data.map((r: { role: string }) => r.role);
    return mapDatabaseRoleToAppRole(roles);
  } catch {
    return null;
  }
}

/**
 * Builds an AuthSession from provider session data and server-verified database roles.
 */
export async function buildSessionFromProvider(
  providerSession: { access_token: string; expires_at?: number },
  providerUser: { id: string; email?: string; user_metadata?: Record<string, unknown> }
): Promise<AuthSession | null> {
  const trustedRole = await fetchUserTrustedRole(providerUser.id);
  if (!trustedRole) {
    return null;
  }

  const email = (providerUser.email || '').trim().toLowerCase();
  const displayName =
    typeof providerUser.user_metadata?.full_name === 'string' && providerUser.user_metadata.full_name.trim()
      ? providerUser.user_metadata.full_name.trim()
      : email
      ? email.split('@')[0]
      : 'User';
  const preferredLanguage = providerUser.user_metadata?.preferred_language === 'en' ? 'en' : 'ur';

  const expiresAt = providerSession.expires_at
    ? providerSession.expires_at * 1000
    : Date.now() + DEFAULT_SESSION_DURATION_MS;

  return {
    user: {
      id: providerUser.id,
      email,
      displayName,
      role: trustedRole,
      preferredLanguage,
    },
    role: trustedRole,
    token: providerSession.access_token,
    expiresAt,
    isAuthenticated: true,
  };
}

/**
 * Initializes authentication lifecycle: restores active provider session if valid,
 * binds listener for provider events (token refresh, sign out, callback),
 * and fails closed if provider is unconfigured or credentials are invalid.
 */
export async function initAuth(): Promise<AuthSession> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    setSessionInMemory(unauthenticatedSession());
    return currentSession;
  }

  try {
    const { data: { session: existingSession } } = await supabase.auth.getSession();
    if (existingSession && existingSession.user) {
      const session = await buildSessionFromProvider(existingSession, existingSession.user);
      if (session && validateSession(session).valid) {
        setSessionInMemory(session);
      } else {
        await supabase.auth.signOut();
        setSessionInMemory(unauthenticatedSession());
      }
    } else {
      setSessionInMemory(unauthenticatedSession());
    }
  } catch (err) {
    console.error('[Gulistan Auth] Failed to initialize provider session:', err);
    setSessionInMemory(unauthenticatedSession());
  }

  if (!isListenerRegistered) {
    isListenerRegistered = true;
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (session && session.user) {
          const authSession = await buildSessionFromProvider(session, session.user);
          if (authSession && validateSession(authSession).valid) {
            setSessionInMemory(authSession);
          } else {
            await supabase.auth.signOut();
            setSessionInMemory(unauthenticatedSession());
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setSessionInMemory(unauthenticatedSession());
      }
    });
  }

  return currentSession;
}

/**
 * Bureau staff sign-in using verified email and password via Supabase Auth.
 */
export async function signInWithPassword(email: string, password: string): Promise<AuthResult> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !password) {
    return {
      success: false,
      session: null,
      error: {
        code: 'MISSING_CREDENTIALS',
        messageEn: 'Please enter both email and password.',
        messageUrdu: 'براہ کرم ای میل اور پاس ورڈ دونوں درج کریں۔',
      },
    };
  }

  if (!isValidEmail(cleanEmail)) {
    return {
      success: false,
      session: null,
      error: {
        code: 'INVALID_EMAIL',
        messageEn: 'Please enter a valid email address.',
        messageUrdu: 'براہ کرم درست ای میل پتہ درج کریں۔',
      },
    };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, session: null, error: providerUnavailableError() };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error || !data.user || !data.session) {
      setSessionInMemory(unauthenticatedSession());
      const errorMsg = error?.message || 'Invalid credentials';
      const isRateLimit = errorMsg.toLowerCase().includes('rate limit') || errorMsg.toLowerCase().includes('too many');
      return {
        success: false,
        session: null,
        error: {
          code: isRateLimit ? 'RATE_LIMITED' : 'INVALID_CREDENTIALS',
          messageEn: isRateLimit
            ? 'Too many sign-in attempts. Please wait and try again later.'
            : 'Invalid email or password. Please check your credentials.',
          messageUrdu: isRateLimit
            ? 'بہت زیادہ کوششیں ہو گئیں۔ براہ کرم کچھ دیر بعد دوبارہ کوشش کریں۔'
            : 'غلط ای میل یا پاس ورڈ۔ براہ کرم اپنی تفصیلات کی تصدیق کریں۔',
        },
      };
    }

    const session = await buildSessionFromProvider(data.session, data.user);
    if (!session) {
      await supabase.auth.signOut();
      setSessionInMemory(unauthenticatedSession());
      return {
        success: false,
        session: null,
        error: {
          code: 'ROLE_NOT_ASSIGNED',
          messageEn: 'Your account does not have an assigned system role. Access denied.',
          messageUrdu: 'آپ کے اکاؤنٹ کو کوئی اجازت نامہ تفویض نہیں کیا گیا۔ رسائی مسترد۔',
        },
      };
    }

    setSessionInMemory(session);
    return { success: true, session };
  } catch (err) {
    return {
      success: false,
      session: null,
      error: {
        code: 'AUTH_ERROR',
        messageEn: `Authentication error: ${err instanceof Error ? err.message : String(err)}`,
        messageUrdu: 'لاگ اِن کی تصدیق کے دوران غیر متوقع خرابی پیش آئی۔',
      },
    };
  }
}

/**
 * Customer and family magic-link OTP sign-in via Supabase Auth.
 * Prohibits public self-registration with shouldCreateUser: false.
 * Dispatches link but does NOT create an authenticated session until verified callback.
 */
export async function sendMagicLink(email: string): Promise<AuthResult> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !isValidEmail(cleanEmail)) {
    return {
      success: false,
      session: null,
      error: {
        code: 'INVALID_EMAIL',
        messageEn: 'Please enter a valid email address.',
        messageUrdu: 'براہ کرم درست ای میل پتہ درج کریں۔',
      },
    };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, session: null, error: providerUnavailableError() };
  }

  try {
    const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: redirectTo,
      },
    });

    if (error) {
      const msg = error.message.toLowerCase();
      const isNotFound = msg.includes('signups not allowed') || msg.includes('user not found') || msg.includes('not registered');
      return {
        success: false,
        session: null,
        error: {
          code: isNotFound ? 'ACCOUNT_NOT_FOUND' : 'MAGIC_LINK_ERROR',
          messageEn: isNotFound
            ? 'No registered account found for this email. Public registration is closed; please contact bureau staff.'
            : `Unable to send sign-in link: ${error.message}`,
          messageUrdu: isNotFound
            ? 'اس ای میل کے لیے کوئی رجسٹرڈ اکاؤنٹ نہیں ملا۔ عوامی رجسٹریشن بند ہے؛ براہ کرم بیورو اسٹاف سے رابطہ کریں۔'
            : 'لاگ اِن لنک بھیجنے میں خرابی پیش آئی۔',
        },
      };
    }

    return { success: true, session: null };
  } catch (err) {
    return {
      success: false,
      session: null,
      error: {
        code: 'AUTH_ERROR',
        messageEn: `Magic link dispatch error: ${err instanceof Error ? err.message : String(err)}`,
        messageUrdu: 'میجک لنک بھیجنے کے دوران غیر متوقع خرابی پیش آئی۔',
      },
    };
  }
}

export async function signOut(): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('[Gulistan Auth] Provider sign-out error:', err);
    }
  }
  setSessionInMemory(unauthenticatedSession());
}

export function getCurrentSession(): AuthSession {
  return { ...currentSession };
}

export function updateUserPreferredLanguage(lang: 'en' | 'ur'): void {
  if (!currentSession.user) return;
  currentSession = {
    ...currentSession,
    user: { ...currentSession.user, preferredLanguage: lang },
  };
  notifyListeners();
}

/**
 * Test-only seams. Never call these from application UI or production code.
 */
export function setSessionForTesting(session: AuthSession): void {
  setSessionInMemory({ ...session });
}

export function resetAuthForTesting(): void {
  isListenerRegistered = false;
  currentSession = unauthenticatedSession();
  listeners.clear();
}
