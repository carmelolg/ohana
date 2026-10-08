import { describe, expect, it } from 'vitest';
import { netBalancesIn, transfersFor } from './balances';
import type { Expense, Settlement } from './types';

const expense = (space: string, payer: string, amount: number, shares: Record<string, number>): Expense =>
  ({
    id: `${space}${payer}${amount}`,
    space_id: space,
    payer_id: payer,
    amount,
    description: 'x',
    date: '2026-10-08',
    event_id: null,
    expense_shares: Object.entries(shares).map(([user_id, a]) => ({ user_id, amount: a })),
  }) as Expense;

describe('saldi per ambito', () => {
  const expenses = [
    expense('casa', 'a', 100, { a: 50, b: 50 }),
    expense('genitori', 'b', 60, { a: 30, b: 30 }),
  ];
  const settlements: Settlement[] = [
    { id: 's', space_id: 'casa', from_id: 'b', to_id: 'a', amount: 20, date: '2026-10-08' },
  ];

  it('solo gli spazi in ambito', () => {
    expect(netBalancesIn(expenses, settlements, (s) => s === 'casa')).toEqual({ a: 30, b: -30 });
    expect(netBalancesIn(expenses, settlements, (s) => s === 'genitori')).toEqual({ a: -30, b: 30 });
  });
  it('tutti gli spazi insieme', () => {
    expect(netBalancesIn(expenses, settlements, () => true)).toEqual({ a: 0, b: 0 });
  });
  it('pagamenti che riguardano una persona', () => {
    const net = netBalancesIn(expenses, settlements, (s) => s === 'casa');
    expect(transfersFor(net, 'b')).toEqual([{ from: 'b', to: 'a', amount: 30 }]);
    expect(transfersFor(net, 'zz')).toEqual([]);
  });
});
