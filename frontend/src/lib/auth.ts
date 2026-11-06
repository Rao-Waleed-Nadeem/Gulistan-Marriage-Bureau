/**
 * Authentication boundary — Gulistan Marriage Bureau.
 *
 * SECURITY STATE:
 * - Demo credentials and locally fabricated login sessions are disabled.
 * - No browser-generated token or client-selected role is an authenticated identity.
 * - Until a real identity provider is provisioned and verified, all sign-in
 *   attempts fail closed.
 * - UI role checks are navigation safeguards only; backend authorization must
 *   enforce every protected operation.
 */

import { Role } from '../types';

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
 * Remove sessions created by the former demo implementation.
 * Browser storage is never accepted as proof of identity.
 */
function initSession(): AuthSession {
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage?.removeItem(LEGACY_SESSION_STORAGE_KEY);
    } catch {
      // Storage may be unavailable; the in-memory state still fails closed.
    }
  }
  return unauthenticatedSession();
}

let currentSession: AuthSession = initSession();

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

/**
 * Session state is memory-only. A future provider integration must supply
 * verified provider sessions; this module must not manufacture credentials.
 */
function setSessionInMemory(session: AuthSession): void {
  currentSession = session;
  notifyListeners();
}

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
 * Client-side navigation guard only. This is not a security boundary.
 * Database RLS and trusted server-side authorization remain mandatory.
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

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function providerUnavailableError(): AuthResult['error'] {
  return {
    code: 'AUTH_PROVIDER_NOT_CONFIGURED',
    messageEn: 'Sign-in is temporarily unavailable because verified authentication has not been configured. No account was signed in.',
    messageUrdu: 'تصدیق شدہ لاگ اِن سروس ابھی ترتیب نہیں دی گئی۔ کوئی اکاؤنٹ لاگ اِن نہیں کیا گیا۔',
  };
}

/**
 * Staff sign-in is intentionally disabled until a real provider is integrated.
 * Never replace this with hardcoded credentials or a locally generated session.
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

  return { success: false, session: null, error: providerUnavailableError() };
}

/**
 * Customer magic-link sign-in is intentionally disabled until an actual
 * provider sends and verifies the link. Merely entering an email never signs in.
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

  return { success: false, session: null, error: providerUnavailableError() };
}

export async function signOut(): Promise<void> {
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
 * Test-only seam. Never call this from application UI or production workflows.
 */
export function setSessionForTesting(session: AuthSession): void {
  setSessionInMemory({ ...session });
}
