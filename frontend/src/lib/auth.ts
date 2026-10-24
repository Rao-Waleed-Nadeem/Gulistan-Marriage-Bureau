/**
 * Authentication & Session Management Module — Gulistan Marriage Bureau
 * 
 * ARCHITECTURAL POLICIES (DECIDED: OPEN-001 & OPEN-002):
 * - Hybrid Authentication: Staff uses Email + Password; Families use Magic Links.
 * - Least Privilege: UI state alone NEVER grants permissions.
 * - Fail Closed: Any protected route accessed without a valid, unexpired session is rejected.
 * - Demo Mode: Preserved safely offline for local testing without cloud credentials.
 */

import { Role } from '../types';
import { getClientConfig } from './config';

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
  expiresAt: number | null; // Unix timestamp in milliseconds
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

const SESSION_STORAGE_KEY = 'gulistan_auth_session';
export const DEFAULT_SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours

function initSession(): AuthSession {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const stored = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (stored) {
        const parsed: AuthSession = JSON.parse(stored);
        if (parsed && parsed.isAuthenticated && parsed.expiresAt && Date.now() < parsed.expiresAt) {
          return parsed;
        } else {
          window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
        }
      }
    } catch {
      // Ignore storage parse errors
    }
  }
  return {
    user: null,
    role: 'public',
    token: null,
    expiresAt: null,
    isAuthenticated: false,
  };
}

// Active session state
let currentSession: AuthSession = initSession();

// Listeners for session state changes
type SessionListener = (session: AuthSession) => void;
const listeners = new Set<SessionListener>();

export function subscribeToAuthChanges(listener: SessionListener): () => void {
  listeners.add(listener);
  listener(currentSession);
  return () => {
    listeners.delete(listener);
  };
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

function persistSession(session: AuthSession): void {
  currentSession = session;
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      if (session.isAuthenticated) {
        window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      } else {
        window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch {
      // Ignore storage errors
    }
  }
  notifyListeners();
}

/**
 * Validates whether a session is active, unexpired, and authentic.
 */
export function validateSession(session: AuthSession | null): {
  valid: boolean;
  reason?: 'missing' | 'expired' | 'unauthenticated';
} {
  if (!session || !session.isAuthenticated || !session.user) {
    return { valid: false, reason: 'missing' };
  }

  if (session.expiresAt && Date.now() > session.expiresAt) {
    return { valid: false, reason: 'expired' };
  }

  return { valid: true };
}

/**
 * Checks whether the given session has authority to access a target role view.
 * FAILS CLOSED: Returns false by default if session is invalid or unauthorized.
 */
export function canAccessRole(session: AuthSession | null, targetRole: Role): boolean {
  if (targetRole === 'public') {
    return true;
  }

  const validation = validateSession(session);
  if (!validation.valid || !session?.user) {
    return false;
  }

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

/**
 * Authenticates staff using email and password.
 */
export async function signInWithPassword(
  email: string,
  password: string
): Promise<AuthResult> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = password.trim();

  if (!cleanEmail || !cleanPassword) {
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

  // Simple email pattern check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
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

  const clientConfig = getClientConfig();

  // If live backend is configured, Supabase Auth integration is invoked
  if (clientConfig.mode === 'backend') {
    return {
      success: false,
      session: null,
      error: {
        code: 'BACKEND_NOT_PROVISIONED',
        messageEn: 'Live backend authentication is not yet provisioned. Switch to demo mode.',
        messageUrdu: 'لائیو بیک اینڈ سروس ابھی دستیاب نہیں ہے۔ براہ کرم ڈیمو موڈ استعمال کریں۔',
      },
    };
  }

  // Demo / Local Mode Authentication (Safe Synthetic Staff Personas)
  let role: Role = 'public';
  let displayName = 'Staff Member';

  if (cleanEmail === 'nadeem@gulistan.pk' && cleanPassword === 'Nadeem2026!') {
    role = 'nadeem';
    displayName = 'Nadeem Ahmed (Lead Matchmaker)';
  } else if (cleanEmail === 'admin@gulistan.pk' && cleanPassword === 'Admin2026!') {
    role = 'admin';
    displayName = 'System Administrator';
  } else if (cleanEmail.includes('admin') && cleanPassword === 'Admin2026!') {
    role = 'admin';
    displayName = 'System Administrator';
  } else if ((cleanEmail.includes('nadeem') || cleanEmail.includes('matchmaker')) && cleanPassword === 'Nadeem2026!') {
    role = 'nadeem';
    displayName = 'Nadeem Ahmed (Matchmaker)';
  } else {
    return {
      success: false,
      session: null,
      error: {
        code: 'INVALID_CREDENTIALS',
        messageEn: 'Invalid email or password. Use demo staff credentials: nadeem@gulistan.pk / Nadeem2026!',
        messageUrdu: 'ای میل یا پاس ورڈ غلط ہے۔ ڈیمو کریڈینشلز استعمال کریں: nadeem@gulistan.pk / Nadeem2026!',
      },
    };
  }

  const newSession: AuthSession = {
    user: {
      id: `usr-${Date.now()}`,
      email: cleanEmail,
      displayName,
      role,
      preferredLanguage: role === 'admin' ? 'en' : 'ur',
    },
    role,
    token: `demo-token-${Date.now()}`,
    expiresAt: Date.now() + DEFAULT_SESSION_DURATION_MS,
    isAuthenticated: true,
  };

  persistSession(newSession);

  return {
    success: true,
    session: newSession,
  };
}

/**
 * Dispatches a passwordless Magic Link to candidate or family email.
 */
export async function sendMagicLink(email: string): Promise<AuthResult> {
  const cleanEmail = email.trim().toLowerCase();

  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
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

  const clientConfig = getClientConfig();

  if (clientConfig.mode === 'backend') {
    return {
      success: false,
      session: null,
      error: {
        code: 'BACKEND_NOT_PROVISIONED',
        messageEn: 'Live backend authentication is not yet provisioned. Switch to demo mode.',
        messageUrdu: 'لائیو بیک اینڈ سروس ابھی دستیاب نہیں ہے۔',
      },
    };
  }

  // Demo Mode: Mock instant magic link verification for candidate
  const newSession: AuthSession = {
    user: {
      id: 'usr-customer-fatima',
      email: cleanEmail,
      displayName: 'Dr. Fatima (Candidate Family)',
      role: 'customer',
      preferredLanguage: 'ur',
    },
    role: 'customer',
    token: `demo-magic-token-${Date.now()}`,
    expiresAt: Date.now() + DEFAULT_SESSION_DURATION_MS,
    isAuthenticated: true,
  };

  persistSession(newSession);

  return {
    success: true,
    session: newSession,
  };
}

/**
 * Terminates the active session and fails closed to public state.
 */
export async function signOut(): Promise<void> {
  const blankSession: AuthSession = {
    user: null,
    role: 'public',
    token: null,
    expiresAt: null,
    isAuthenticated: false,
  };

  persistSession(blankSession);
}

/**
 * Returns a snapshot of the current session.
 */
export function getCurrentSession(): AuthSession {
  return { ...currentSession };
}

/**
 * For testing purposes: manually sets session state.
 */
export function setSessionForTesting(session: AuthSession): void {
  currentSession = { ...session };
  notifyListeners();
}
