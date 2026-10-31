import { Language } from '../types';

export const LANGUAGE_STORAGE_KEY = 'gulistan_preferred_language';

/**
 * Resolves the application language according to the strict priority:
 * 1. Authenticated user preference (if provided and valid)
 * 2. Persisted local storage preference
 * 3. Default application language ('ur' per Pakistani bureau domain standard)
 */
export function resolveInitialLanguage(authenticatedUserPreference?: string | null): Language {
  if (authenticatedUserPreference === 'en' || authenticatedUserPreference === 'ur') {
    return authenticatedUserPreference;
  }

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

  return 'ur';
}

/**
 * Persists the chosen language to local storage and synchronizes document attributes (dir and lang).
 */
export function persistLanguagePreference(lang: Language): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {
      // Gracefully handle storage quotas or restrictions
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
