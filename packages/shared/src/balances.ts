export interface ExpenseInput {
  payerId: string;
  amount: number; // euro
  shares: { userId: string; amount: number }[];
}
export interface SettlementInput {
  fromId: string;
  toId: string;
  amount: number;
}
export interface Transfer {
  from: string;
  to: string;
  amount: number;
}

const toCents = (n: number) => Math.round(n * 100);
const toEuro = (c: number) => c / 100;

/** Divide `total` (euro) in parti uguali; i centesimi residui vanno ai primi. */
export function splitEqual(total: number, userIds: string[]): { userId: string; amount: number }[] {
  if (userIds.length === 0) {
    return [];
  }
  const cents = toCents(total);
  const base = Math.floor(cents / userIds.length);
  let rest = cents - base * userIds.length;
  return userIds.map((userId) => {
    const extra = rest > 0 ? 1 : 0;
    rest -= extra;
    return { userId, amount: toEuro(base + extra) };
  });
}

/** Saldo netto per persona in euro: positivo = deve ricevere, negativo = deve dare. */
export function netBalances(
  expenses: ExpenseInput[],
  settlements: SettlementInput[] = [],
): Record<string, number> {
  const net: Record<string, number> = {};
  const add = (id: string, c: number) => (net[id] = (net[id] ?? 0) + c);
  for (const e of expenses) {
    add(e.payerId, toCents(e.amount));
    for (const s of e.shares) {
      add(s.userId, -toCents(s.amount));
    }
  }
  for (const s of settlements) {
    add(s.fromId, toCents(s.amount));
    add(s.toId, -toCents(s.amount));
  }
  return Object.fromEntries(Object.entries(net).map(([k, v]) => [k, toEuro(v)]));
}

/** Riduce i debiti al minor numero di pagamenti (greedy creditore/debitore maggiore). */
export function simplifyDebts(net: Record<string, number>): Transfer[] {
  const creditors: [string, number][] = [];
  const debtors: [string, number][] = [];
  for (const [id, v] of Object.entries(net)) {
    const c = toCents(v);
    if (c > 0) {
      creditors.push([id, c]);
    } else if (c < 0) {
      debtors.push([id, -c]);
    }
  }
  const out: Transfer[] = [];
  creditors.sort((a, b) => b[1] - a[1]);
  debtors.sort((a, b) => b[1] - a[1]);
  let i = 0;
  let j = 0;
  while (i < creditors.length && j < debtors.length) {
    const pay = Math.min(creditors[i][1], debtors[j][1]);
    out.push({ from: debtors[j][0], to: creditors[i][0], amount: toEuro(pay) });
    creditors[i][1] -= pay;
    debtors[j][1] -= pay;
    if (creditors[i][1] === 0) {
      i++;
    }
    if (debtors[j][1] === 0) {
      j++;
    }
  }
  return out;
}

/** Riga di spesa come arriva dal database (importi `numeric` possono arrivare come stringhe). */
export interface ExpenseRowLike {
  space_id: string;
  payer_id: string;
  amount: number | string;
  expense_shares: { user_id: string; amount: number | string }[];
}
export interface SettlementRowLike {
  space_id: string;
  from_id: string;
  to_id: string;
  amount: number | string;
}

/** Saldi netti e pagamenti per pareggiare, per un solo spazio. */
export function balancesForSpace(
  spaceId: string,
  expenses: ExpenseRowLike[],
  settlements: SettlementRowLike[],
): { net: Record<string, number>; transfers: Transfer[] } {
  const net = netBalances(
    expenses
      .filter((e) => e.space_id === spaceId)
      .map((e) => ({
        payerId: e.payer_id,
        amount: Number(e.amount),
        shares: e.expense_shares.map((s) => ({ userId: s.user_id, amount: Number(s.amount) })),
      })),
    settlements
      .filter((s) => s.space_id === spaceId)
      .map((s) => ({ fromId: s.from_id, toId: s.to_id, amount: Number(s.amount) })),
  );
  return { net, transfers: simplifyDebts(net) };
}

/** Importo scritto a mano («84,20» o «84.20»); `null` se vuoto o non numerico. */
export function parseMoneyInput(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === '') {
    return null;
  }
  const n = Number(trimmed.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** Differenza (in euro) tra la somma delle quote e il totale; `0` se tornano al centesimo. */
export function sharesDifference(shares: { amount: number }[], total: number): number {
  const sumCents = Math.round(shares.reduce((t, s) => t + s.amount * 100, 0));
  return toEuro(sumCents - toCents(total));
}
