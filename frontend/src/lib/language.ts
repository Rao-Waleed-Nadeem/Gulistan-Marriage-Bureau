import { Language } from '../types';

export const LANGUAGE_STORAGE_KEY = 'gulistan_preferred_language';
export const LANGUAGE_CHANGE_EVENT = 'gulistan_language_changed';

export const ROLE_LANGUAGE_KEYS = {
  public: 'gulistan_role_lang_public',
  nadeem: 'gulistan_role_lang_nadeem',
  customer: 'gulistan_role_lang_customer',
  admin: 'gulistan_role_lang_admin',
} as const;

/**
 * Resolves the application language with permanent persistence:
 * 1. Persistent browser localStorage preference (Highest priority: respects user's explicit choice)
 * 2. Authenticated user preference (Fallback when localStorage is not yet set)
 * 3. Default application language ('ur' per Pakistani bureau domain standard)
 */
export function resolveInitialLanguage(authenticatedUserPreference?: string | null): Language {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (stored === 'en' || stored === 'ur') {
        return stored;
      }
    } catch {
      // Gracefully fall back if localStorage is restricted
    }
  }

  if (authenticatedUserPreference === 'en' || authenticatedUserPreference === 'ur') {
    return authenticatedUserPreference;
  }

  return 'ur';
}

/**
 * Persists the chosen language permanently:
 * - Saves to localStorage (global app key and all role profile keys)
 * - Does not read or write authentication/session storage.
 * - Sets document attributes (lang and dir)
 * - Dispatches a window change event for instant reactive synchronization
 */
export function persistLanguagePreference(lang: Language): void {
  if (typeof window !== 'undefined') {
    if (window.localStorage) {
      try {
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
        window.localStorage.setItem(ROLE_LANGUAGE_KEYS.public, lang);
        window.localStorage.setItem(ROLE_LANGUAGE_KEYS.nadeem, lang);
        window.localStorage.setItem(ROLE_LANGUAGE_KEYS.customer, lang);
        window.localStorage.setItem(ROLE_LANGUAGE_KEYS.admin, lang);
      } catch {
        // Gracefully handle storage quotas or restrictions
      }
    }

    try {
      window.dispatchEvent(new CustomEvent(LANGUAGE_CHANGE_EVENT, { detail: lang }));
    } catch {
      // Ignore event dispatch errors in testing environments
    }
  }

  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ur' ? 'rtl' : 'ltr';
  }
}

/**
 * Applies document language and direction attributes immediately to prevent hydration flicker.
 */
export function applyDocumentLanguage(lang: Language): void {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ur' ? 'rtl' : 'ltr';
  }
}
