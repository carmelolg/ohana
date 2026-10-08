import { netBalances, simplifyDebts, type Transfer } from '@ohana/shared';
import type { Expense, Settlement } from './types';

/** Saldo netto di ogni persona (euro) sulle spese e i saldi degli spazi per cui `inScope` è vero. */
export function netBalancesIn(
  expenses: Expense[],
  settlements: Settlement[],
  inScope: (spaceId: string) => boolean,
): Record<string, number> {
  return netBalances(
    expenses
      .filter((e) => inScope(e.space_id))
      .map((e) => ({
        payerId: e.payer_id,
        amount: Number(e.amount),
        shares: e.expense_shares.map((s) => ({ userId: s.user_id, amount: Number(s.amount) })),
      })),
    settlements
      .filter((s) => inScope(s.space_id))
      .map((s) => ({ fromId: s.from_id, toId: s.to_id, amount: Number(s.amount) })),
  );
}

/** I pagamenti che riguardano `userId` per pareggiare i conti. */
export function transfersFor(net: Record<string, number>, userId: string): Transfer[] {
  return simplifyDebts(net).filter((t) => t.from === userId || t.to === userId);
}
