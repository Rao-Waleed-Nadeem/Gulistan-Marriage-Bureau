import { useState, useEffect, useCallback } from 'react';
import { ProfileRecord, ProfileStatus } from '../types';
import { AuthSession } from '../lib/auth';
import { profileRepository, ProfileFilters } from '../lib/repositories';

export interface UseProfilesResult {
  profiles: ProfileRecord[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createProfile: (data: Partial<ProfileRecord>) => Promise<ProfileRecord>;
  updateStatus: (id: string, newStatus: ProfileStatus) => Promise<ProfileRecord>;
}

export function useProfiles(
  session: AuthSession | null,
  filters?: ProfileFilters
): UseProfilesResult {
  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await profileRepository.findAll(session, filters);
      setProfiles(data);
    } catch (err: any) {
      console.error('[Gulistan] useProfiles fetch failed:', err);
      setError(err?.message || 'Failed to load candidate profiles.');
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, [session, filters?.status, filters?.gender, filters?.city]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const createProfile = useCallback(
    async (data: Partial<ProfileRecord>): Promise<ProfileRecord> => {
      const created = await profileRepository.create(data, session);
      setProfiles((prev) => [created, ...prev]);
      return created;
    },
    [session]
  );

  const updateStatus = useCallback(
    async (id: string, newStatus: ProfileStatus): Promise<ProfileRecord> => {
      const updated = await profileRepository.updateStatus(id, newStatus, session);
      setProfiles((prev) => prev.map((p) => (p.id === id ? updated : p)));
      return updated;
    },
    [session]
  );

  return {
    profiles,
    loading,
    error,
    refetch: fetchProfiles,
    createProfile,
    updateStatus,
  };
}
