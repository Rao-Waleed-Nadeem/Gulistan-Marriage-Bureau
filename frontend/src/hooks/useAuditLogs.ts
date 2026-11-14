import { useState, useEffect, useCallback } from 'react';
import { AuditLogItem } from '../types';
import { AuthSession } from '../lib/auth';
import { auditRepository } from '../lib/repositories';

export interface UseAuditLogsResult {
  auditLogs: AuditLogItem[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  recordAuditLog: (logData: Omit<AuditLogItem, 'id' | 'timestamp'>) => Promise<AuditLogItem>;
}

export function useAuditLogs(session: AuthSession | null, limit: number = 100): UseAuditLogsResult {
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAuditLogs = useCallback(async () => {
    // Audit logs require staff authentication
    if (!session || !session.isAuthenticated || (session.role !== 'admin' && session.role !== 'nadeem')) {
      setAuditLogs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await auditRepository.findAll(session, limit);
      setAuditLogs(data);
    } catch (err: any) {
      console.error('[Gulistan] useAuditLogs fetch failed:', err);
      setError(err?.message || 'Failed to load audit trail.');
      setAuditLogs([]);
    } finally {
      setLoading(false);
    }
  }, [session, limit]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const recordAuditLog = useCallback(
    async (logData: Omit<AuditLogItem, 'id' | 'timestamp'>): Promise<AuditLogItem> => {
      const item = await auditRepository.record(logData, session);
      setAuditLogs((prev) => [item, ...prev]);
      return item;
    },
    [session]
  );

  return {
    auditLogs,
    loading,
    error,
    refetch: fetchAuditLogs,
    recordAuditLog,
  };
}
