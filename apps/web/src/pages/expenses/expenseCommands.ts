import type { Mutate } from '../../lib/data';
import { newId } from '../../lib/outbox';

export async function settleDebt(
  mutate: Mutate,
  spaceId: string,
  fromId: string,
  toId: string,
  amount: number,
): Promise<void> {
  await mutate({
    table: 'settlements',
    action: 'upsert',
    payload: { id: newId(), space_id: spaceId, from_id: fromId, to_id: toId, amount },
  });
}

export async function deleteExpense(mutate: Mutate, id: string): Promise<void> {
  await mutate({ table: 'expenses', action: 'delete', match: { id } });
}

export interface NewExpense {
  spaceId: string;
  payerId: string;
  amount: number;
  description: string;
  date: string;
  eventId: string | null;
  shares: { userId: string; amount: number }[];
}

export async function createExpense(mutate: Mutate, e: NewExpense): Promise<void> {
  const id = newId();
  await mutate({
    table: 'expenses',
    action: 'upsert',
    payload: {
      id,
      space_id: e.spaceId,
      payer_id: e.payerId,
      amount: e.amount,
      description: e.description,
      date: e.date,
      event_id: e.eventId,
    },
  });
  await mutate({
    table: 'expense_shares',
    action: 'upsert',
    payload: e.shares.map((s) => ({ expense_id: id, user_id: s.userId, amount: s.amount })),
    onConflict: 'expense_id,user_id',
  });
}
