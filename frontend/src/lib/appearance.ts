export type ClarityMode = 'clear' | 'ultra' | 'soft';

export const CLARITY_STORAGE_KEY = 'gulistan_background_clarity';
export const CLARITY_CHANGE_EVENT = 'gulistan_clarity_changed';

/**
 * Resolves the persisted background clarity mode from localStorage, defaulting to 'clear'.
 */
export function resolveInitialClarity(): ClarityMode {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem(CLARITY_STORAGE_KEY);
      if (stored === 'clear' || stored === 'ultra' || stored === 'soft') {
        return stored;
      }
    } catch {
      // Fall back if localStorage is inaccessible
    }
  }
  return 'clear';
}

/**
 * Persists the background clarity mode and dispatches an event for live updates.
 */
export function persistClarityPreference(mode: ClarityMode): void {
  if (typeof window !== 'undefined') {
    if (window.localStorage) {
      try {
        window.localStorage.setItem(CLARITY_STORAGE_KEY, mode);
      } catch {
        // Ignore quota/access errors
      }
    }
    window.dispatchEvent(new CustomEvent(CLARITY_CHANGE_EVENT, { detail: mode }));
  }
}
