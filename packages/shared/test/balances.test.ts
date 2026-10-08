import { describe, expect, it } from 'vitest';
import {
  balancesForSpace,
  netBalances,
  parseMoneyInput,
  sharesDifference,
  simplifyDebts,
  splitEqual,
} from '../src';

describe('splitEqual', () => {
  it('distribuisce i centesimi residui', () => {
    const s = splitEqual(10, ['a', 'b', 'c']);
    expect(s.map((x) => x.amount)).toEqual([3.34, 3.33, 3.33]);
    expect(s.reduce((t, x) => t + Math.round(x.amount * 100), 0)).toBe(1000);
  });
});

describe('saldi', () => {
  const exp = [
    { payerId: 'a', amount: 90, shares: splitEqual(90, ['a', 'b', 'c']) },
    { payerId: 'b', amount: 30, shares: splitEqual(30, ['a', 'b', 'c']) },
  ];
  it('saldo netto', () => {
    expect(netBalances(exp)).toEqual({ a: 50, b: -10, c: -40 });
  });
  it('semplifica i debiti', () => {
    const t = simplifyDebts(netBalances(exp));
    expect(t).toEqual([
      { from: 'c', to: 'a', amount: 40 },
      { from: 'b', to: 'a', amount: 10 },
    ]);
  });
  it('i saldati azzerano il debito', () => {
    const net = netBalances(exp, [{ fromId: 'c', toId: 'a', amount: 40 }]);
    expect(simplifyDebts(net)).toEqual([{ from: 'b', to: 'a', amount: 10 }]);
  });
  it('catena a tre: riduce a 2 pagamenti', () => {
    const t = simplifyDebts({ a: 30, b: -10, c: -20 });
    expect(t).toHaveLength(2);
    expect(t.reduce((s, x) => s + x.amount, 0)).toBe(30);
  });
  it('quote personalizzate', () => {
    const net = netBalances([
      {
        payerId: 'a',
        amount: 100,
        shares: [
          { userId: 'a', amount: 20 },
          { userId: 'b', amount: 80 },
        ],
      },
    ]);
    expect(net).toEqual({ a: 80, b: -80 });
  });
});

describe('balancesForSpace / importi scritti a mano', () => {
  const expenses = [
    {
      space_id: 's1',
      payer_id: 'a',
      amount: '30.00',
      expense_shares: [
        { user_id: 'a', amount: '10.00' },
        { user_id: 'b', amount: 10 },
        { user_id: 'c', amount: 10 },
      ],
    },
    { space_id: 's2', payer_id: 'a', amount: 99, expense_shares: [{ user_id: 'a', amount: 99 }] },
  ];
  it('considera solo lo spazio richiesto e accetta importi come stringhe', () => {
    const { net, transfers } = balancesForSpace('s1', expenses, []);
    expect(net).toEqual({ a: 20, b: -10, c: -10 });
    expect(transfers).toHaveLength(2);
  });
  it('tiene conto dei pagamenti già fatti', () => {
    const { net } = balancesForSpace('s1', expenses, [
      { space_id: 's1', from_id: 'b', to_id: 'a', amount: 10 },
    ]);
    expect(net).toEqual({ a: 10, b: 0, c: -10 });
  });
  it('parseMoneyInput', () => {
    expect(parseMoneyInput('84,20')).toBe(84.2);
    expect(parseMoneyInput(' 84.2 ')).toBe(84.2);
    expect(parseMoneyInput('')).toBeNull();
    expect(parseMoneyInput('abc')).toBeNull();
  });
  it('sharesDifference: 0 se le quote tornano, altrimenti lo scarto', () => {
    expect(sharesDifference([{ amount: 3.33 }, { amount: 3.33 }, { amount: 3.34 }], 10)).toBe(0);
    expect(sharesDifference([{ amount: 5 }, { amount: 4 }], 10)).toBe(-1);
  });
});
