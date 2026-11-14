/**
 * Financial Ledger Calculations for Matchmaker & External Agent Accounts
 */

export interface FinancialTransaction {
  id: string;
  matchmakerId: string;
  matchmakerName: string;
  date: string;
  type: 'payable' | 'receivable' | 'paid' | 'received' | 'reversal';
  amount: number;
  description: string;
  status: 'settled' | 'pending' | 'reversed';
  profileId?: string;
  reversalOf?: string;
  reversalReason?: string;
}

export interface MatchmakerLedgerSummary {
  matchmakerId: string;
  matchmakerName: string;
  totalOwedToAgent: number; // We need to pay agent (Payable liability)
  totalOwedByAgent: number; // Agent needs to pay us (Receivable asset)
  netBalance: number; // OPEN-010: Positive = agent owes bureau (asset), negative = bureau owes agent (liability)
}

export function calculateMatchmakerLedger(
  matchmakerId: string,
  matchmakerName: string,
  transactions: FinancialTransaction[]
): MatchmakerLedgerSummary {
  let totalOwedToAgent = 0;
  let totalOwedByAgent = 0;

  const reversedIds = new Set<string>();
  for (const t of transactions) {
    if (t.status === 'reversed') reversedIds.add(t.id);
    if (t.type === 'reversal' && t.reversalOf) reversedIds.add(t.reversalOf);
  }

  for (const t of transactions) {
    if (t.matchmakerId !== matchmakerId) continue;
    if (t.type === 'reversal' || t.status === 'reversed' || reversedIds.has(t.id)) continue;

    if (t.type === 'payable' && t.status === 'pending') {
      totalOwedToAgent += t.amount;
    } else if (t.type === 'receivable' && t.status === 'pending') {
      totalOwedByAgent += t.amount;
    }
  }

  // OPEN-010 approved formula: Net Balance = Total Receivable (owed by agent) - Total Payable (owed to agent)
  return {
    matchmakerId,
    matchmakerName,
    totalOwedToAgent,
    totalOwedByAgent,
    netBalance: totalOwedByAgent - totalOwedToAgent,
  };
}

export function formatPKR(amount: number): string {
  return `₨ ${amount.toLocaleString('en-PK')}`;
}
