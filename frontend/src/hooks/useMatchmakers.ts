import { useState, useEffect, useCallback } from 'react';
import { DetailedExternalMatchmaker, PartnerAgreement } from '../types';
import { AuthSession } from '../lib/auth';
import { matchmakerRepository } from '../lib/repositories';

export interface UseMatchmakersResult {
  matchmakers: DetailedExternalMatchmaker[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createMatchmaker: (
    data: Partial<DetailedExternalMatchmaker>
  ) => Promise<DetailedExternalMatchmaker>;
  updateStatus: (
    id: string,
    status: 'active' | 'suspended' | 'inactive'
  ) => Promise<DetailedExternalMatchmaker>;
  createAgreement: (
    matchmakerId: string,
    agreement: Partial<PartnerAgreement>
  ) => Promise<PartnerAgreement>;
  attributeReferral: (
    matchmakerId: string,
    profileId: string,
    notes?: string
  ) => Promise<{ success: boolean; matchmaker: DetailedExternalMatchmaker }>;
}

export function useMatchmakers(
  session: AuthSession | null,
  filters?: { status?: 'active' | 'suspended' | 'inactive'; city?: string }
): UseMatchmakersResult {
  const [matchmakers, setMatchmakers] = useState<DetailedExternalMatchmaker[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMatchmakers = useCallback(async () => {
    // Matchmaker directory requires staff authentication
    if (!session || !session.isAuthenticated || (session.role !== 'admin' && session.role !== 'nadeem')) {
      setMatchmakers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await matchmakerRepository.findAll(session, filters);
      setMatchmakers(data);
    } catch (err: any) {
      console.error('[Gulistan] useMatchmakers fetch failed:', err);
      setError(err?.message || 'Failed to load external matchmakers.');
      setMatchmakers([]);
    } finally {
      setLoading(false);
    }
  }, [session, filters?.status, filters?.city]);

  useEffect(() => {
    fetchMatchmakers();
  }, [fetchMatchmakers]);

  const createMatchmaker = useCallback(
    async (data: Partial<DetailedExternalMatchmaker>): Promise<DetailedExternalMatchmaker> => {
      const created = await matchmakerRepository.create(data, session);
      setMatchmakers((prev) => [...prev, created]);
      return created;
    },
    [session]
  );

  const updateStatus = useCallback(
    async (
      id: string,
      status: 'active' | 'suspended' | 'inactive'
    ): Promise<DetailedExternalMatchmaker> => {
      const updated = await matchmakerRepository.updateStatus(id, status, session);
      setMatchmakers((prev) => prev.map((m) => (m.id === id ? updated : m)));
      return updated;
    },
    [session]
  );

  const createAgreement = useCallback(
    async (
      matchmakerId: string,
      agreement: Partial<PartnerAgreement>
    ): Promise<PartnerAgreement> => {
      const newAgreement = await matchmakerRepository.createAgreement(
        matchmakerId,
        agreement,
        session
      );
      await fetchMatchmakers();
      return newAgreement;
    },
    [session, fetchMatchmakers]
  );

  const attributeReferral = useCallback(
    async (
      matchmakerId: string,
      profileId: string,
      notes?: string
    ): Promise<{ success: boolean; matchmaker: DetailedExternalMatchmaker }> => {
      const res = await matchmakerRepository.attributeReferral(
        matchmakerId,
        profileId,
        session,
        notes
      );
      setMatchmakers((prev) => prev.map((m) => (m.id === matchmakerId ? res.matchmaker : m)));
      return res;
    },
    [session]
  );

  return {
    matchmakers,
    loading,
    error,
    refetch: fetchMatchmakers,
    createMatchmaker,
    updateStatus,
    createAgreement,
    attributeReferral,
  };
}
