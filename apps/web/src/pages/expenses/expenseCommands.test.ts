import { describe, expect, it } from 'vitest';
import { fakeMutate } from '../../test-utils/fakeMutate';
import { createExpense, settleDebt } from './expenseCommands';

describe('expenseCommands', () => {
  it('createExpense scrive la spesa e le quote collegate', async () => {
    const { mutate, calls, payloadAt } = fakeMutate();
    await createExpense(mutate, {
      spaceId: 's1',
      payerId: 'a',
      amount: 30,
      description: 'Cena',
      date: '2026-10-08',
      eventId: null,
      shares: [
        { userId: 'a', amount: 15 },
        { userId: 'b', amount: 15 },
      ],
    });
    const expense = payloadAt<{ id: string }>(0);
    const shares = payloadAt<{ expense_id: string }[]>(1);
    expect(calls.map((c) => c.op.table)).toEqual(['expenses', 'expense_shares']);
    expect(shares.map((s) => s.expense_id)).toEqual([expense.id, expense.id]);
    expect((calls[1].op as { onConflict?: string }).onConflict).toBe('expense_id,user_id');
  });

  it('settleDebt registra il pagamento', async () => {
    const { mutate, payloadOf } = fakeMutate();
    await settleDebt(mutate, 's1', 'b', 'a', 12.5);
    expect(payloadOf('settlements')!.payload).toMatchObject({
      space_id: 's1',
      from_id: 'b',
      to_id: 'a',
      amount: 12.5,
    });
  });
});
