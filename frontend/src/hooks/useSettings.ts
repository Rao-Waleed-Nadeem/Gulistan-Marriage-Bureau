import { useState, useEffect, useCallback } from 'react';
import { AuthSession } from '../lib/auth';
import {
  settingsRepository,
  AppSettings,
  RegionalLandConventions,
} from '../lib/repositories';

export interface UseSettingsResult {
  settings: AppSettings | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateRegionalConventions: (conventions: RegionalLandConventions) => Promise<AppSettings>;
}

export function useSettings(session: AuthSession | null): UseSettingsResult {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await settingsRepository.getSettings(session);
      setSettings(data);
    } catch (err: any) {
      console.error('[Gulistan] useSettings fetch failed:', err);
      setError(err?.message || 'Failed to load application settings.');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateRegionalConventions = useCallback(
    async (conventions: RegionalLandConventions): Promise<AppSettings> => {
      const updated = await settingsRepository.updateRegionalConventions(conventions, session);
      setSettings(updated);
      return updated;
    },
    [session]
  );

  return {
    settings,
    loading,
    error,
    refetch: fetchSettings,
    updateRegionalConventions,
  };
}
