import { useState, useEffect, useCallback } from 'react';
import { FollowUpItem } from '../types';
import { AuthSession } from '../lib/auth';
import { crmRepository } from '../lib/repositories';

export interface UseCRMResult {
  followUps: FollowUpItem[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createFollowUp: (itemData: Partial<FollowUpItem>) => Promise<FollowUpItem>;
  completeFollowUp: (id: string, notes?: string) => Promise<FollowUpItem>;
}

export function useCRM(
  session: AuthSession | null,
  filters?: { status?: string; priority?: string; profileId?: string }
): UseCRMResult {
  const [followUps, setFollowUps] = useState<FollowUpItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFollowUps = useCallback(async () => {
    // CRM follow-ups require staff authentication
    if (!session || !session.isAuthenticated || (session.role !== 'admin' && session.role !== 'nadeem')) {
      setFollowUps([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await crmRepository.findAll(session, filters);
      setFollowUps(data);
    } catch (err: any) {
      console.error('[Gulistan] useCRM fetch failed:', err);
      setError(err?.message || 'Failed to load follow-up items.');
      setFollowUps([]);
    } finally {
      setLoading(false);
    }
  }, [session, filters?.status, filters?.priority, filters?.profileId]);

  useEffect(() => {
    fetchFollowUps();
  }, [fetchFollowUps]);

  const createFollowUp = useCallback(
    async (itemData: Partial<FollowUpItem>): Promise<FollowUpItem> => {
      const created = await crmRepository.create(itemData, session);
      setFollowUps((prev) => [created, ...prev]);
      return created;
    },
    [session]
  );

  const completeFollowUp = useCallback(
    async (id: string, notes?: string): Promise<FollowUpItem> => {
      const completed = await crmRepository.complete(id, session, notes);
      setFollowUps((prev) => prev.map((f) => (f.id === id ? completed : f)));
      return completed;
    },
    [session]
  );

  return {
    followUps,
    loading,
    error,
    refetch: fetchFollowUps,
    createFollowUp,
    completeFollowUp,
  };
}
