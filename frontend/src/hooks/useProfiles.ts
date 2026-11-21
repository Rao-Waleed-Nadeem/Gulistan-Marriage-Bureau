import { useState, useEffect, useCallback } from 'react';
import { ProfileRecord, ProfileStatus, PaginationCursor } from '../types';
import { AuthSession } from '../lib/auth';
import { profileRepository, ProfileFilters } from '../lib/repositories';

export interface UseProfilesResult {
  profiles: ProfileRecord[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  nextCursor?: PaginationCursor;
  setPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
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
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [nextCursor, setNextCursor] = useState<PaginationCursor | undefined>(undefined);

  const pageSize = filters?.limit ?? 20;

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const paginatedFilters: ProfileFilters = {
        ...filters,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      };
      const result = await profileRepository.findPaginated(session, paginatedFilters);
      setProfiles(result.items);
      setTotalCount(result.totalCount);
      setHasMore(result.hasMore);
      setNextCursor(result.nextCursor);
    } catch (err: any) {
      console.error('[Gulistan] useProfiles fetch failed:', err);
      setError(err?.message || 'Failed to load candidate profiles.');
      setProfiles([]);
      setTotalCount(0);
      setHasMore(false);
      setNextCursor(undefined);
    } finally {
      setLoading(false);
    }
  }, [
    session,
    page,
    pageSize,
    filters?.status,
    filters?.gender,
    filters?.city,
    filters?.caste,
    filters?.minAge,
    filters?.maxAge,
    filters?.maritalStatus,
  ]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const nextPage = useCallback(() => {
    if (hasMore) setPage((prev) => prev + 1);
  }, [hasMore]);

  const prevPage = useCallback(() => {
    setPage((prev) => Math.max(prev - 1, 1));
  }, []);

  const createProfile = useCallback(
    async (data: Partial<ProfileRecord>): Promise<ProfileRecord> => {
      const created = await profileRepository.create(data, session);
      setProfiles((prev) => [created, ...prev]);
      setTotalCount((prev) => prev + 1);
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
    totalCount,
    page,
    pageSize,
    hasMore,
    nextCursor,
    setPage,
    nextPage,
    prevPage,
    refetch: fetchProfiles,
    createProfile,
    updateStatus,
  };
}
