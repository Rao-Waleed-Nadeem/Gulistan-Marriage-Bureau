import { useState, useEffect, useCallback } from 'react';
import { FinancialTransaction } from '../types';
import { AuthSession } from '../lib/auth';
import {
  financeRepository,
  PartnerLedgerSummary,
  BureauReconciliationSummary,
} from '../lib/repositories';

export interface UseFinanceResult {
  transactions: FinancialTransaction[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  recordTransaction: (txData: Partial<FinancialTransaction>) => Promise<FinancialTransaction>;
  reverseTransaction: (id: string, reason: string) => Promise<FinancialTransaction>;
  getPartnerSummary: (matchmakerId: string) => Promise<PartnerLedgerSummary>;
  reconcile: () => Promise<BureauReconciliationSummary>;
}

export function useFinance(
  session: AuthSession | null,
  filters?: { matchmakerId?: string; status?: string; type?: string }
): UseFinanceResult {
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    // Finance data requires staff authentication
    if (!session || !session.isAuthenticated || (session.role !== 'admin' && session.role !== 'nadeem')) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await financeRepository.findAll(session, filters);
      setTransactions(data);
    } catch (err: any) {
      console.error('[Gulistan] useFinance fetch failed:', err);
      setError(err?.message || 'Failed to load financial transactions.');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [session, filters?.matchmakerId, filters?.status, filters?.type]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const recordTransaction = useCallback(
    async (txData: Partial<FinancialTransaction>): Promise<FinancialTransaction> => {
      const recorded = await financeRepository.record(txData, session);
      setTransactions((prev) => [recorded, ...prev]);
      return recorded;
    },
    [session]
  );

  const reverseTransaction = useCallback(
    async (id: string, reason: string): Promise<FinancialTransaction> => {
      const reversal = await financeRepository.reverse(id, reason, session);
      // Refresh list to update both original transaction status and append reversal record
      await fetchTransactions();
      return reversal;
    },
    [session, fetchTransactions]
  );

  const getPartnerSummary = useCallback(
    async (matchmakerId: string): Promise<PartnerLedgerSummary> => {
      return financeRepository.getPartnerSummary(matchmakerId, session);
    },
    [session]
  );

  const reconcile = useCallback(async (): Promise<BureauReconciliationSummary> => {
    return financeRepository.reconcile(session);
  }, [session]);

  return {
    transactions,
    loading,
    error,
    refetch: fetchTransactions,
    recordTransaction,
    reverseTransaction,
    getPartnerSummary,
    reconcile,
  };
}
