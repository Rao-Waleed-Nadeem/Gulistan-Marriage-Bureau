/**
 * Financial Ledger Calculations for Matchmaker & External Agent Accounts
 */

export interface FinancialTransaction {
  id: string;
  matchmakerId: string;
  matchmakerName: string;
  date: string;
  type: 'payable' | 'receivable' | 'paid' | 'received';
  amount: number;
  description: string;
  status: 'settled' | 'pending';
}

export interface MatchmakerLedgerSummary {
  matchmakerId: string;
  matchmakerName: string;
  totalOwedToAgent: number; // We need to pay agent
  totalOwedByAgent: number; // Agent needs to pay us
  netBalance: number; // Positive means we owe them, negative means they owe us
}

export function calculateMatchmakerLedger(
  matchmakerId: string,
  matchmakerName: string,
  transactions: FinancialTransaction[]
): MatchmakerLedgerSummary {
  let totalOwedToAgent = 0;
  let totalOwedByAgent = 0;

  for (const t of transactions) {
    if (t.matchmakerId !== matchmakerId) continue;

    if (t.type === 'payable' && t.status === 'pending') {
      totalOwedToAgent += t.amount;
    } else if (t.type === 'receivable' && t.status === 'pending') {
      totalOwedByAgent += t.amount;
    }
  }

  return {
    matchmakerId,
    matchmakerName,
    totalOwedToAgent,
    totalOwedByAgent,
    netBalance: totalOwedToAgent - totalOwedByAgent,
  };
}

export function formatPKR(amount: number): string {
  return `₨ ${amount.toLocaleString('en-PK')}`;
}
