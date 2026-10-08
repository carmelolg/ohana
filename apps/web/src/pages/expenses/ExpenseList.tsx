import { formatDate, formatEuro } from '@ohana/shared';
import { useAuth } from '../../lib/auth';
import { useExpenses, useMutate, useSpace } from '../../lib/data';
import { useDialog } from '../../lib/dialog';
import type { Expense } from '../../lib/types';
import { deleteExpense } from './expenseCommands';

/** Elenco delle spese, dalla più recente. `scope` è l'id dello spazio o `'all'`. */
export function ExpenseList({ scope }: { scope: string }) {
  const { session } = useAuth();
  const me = session?.user.id;
  const { spaceById, memberName, canWrite } = useSpace();
  const { data: expenses = [] } = useExpenses();
  const mutate = useMutate();
  const dialog = useDialog();

  async function remove(e: Expense) {
    const confirmed = await dialog.confirm({
      title: 'Eliminare la spesa?',
      message: `«${e.description}» sparirà anche dai saldi.`,
      confirmLabel: 'Elimina',
      danger: true,
    });
    if (confirmed) {
      await deleteExpense(mutate, e.id);
    }
  }

  return (
    <div className="list">
      {expenses
        .filter((e) => scope === 'all' || e.space_id === scope)
        .map((e) => (
          <div key={e.id} style={{ borderTop: '1px solid var(--line)', padding: '14px 0' }}>
            <div className="hstack" style={{ justifyContent: 'space-between' }}>
              <b style={{ fontSize: 17 }}>{e.description}</b>
              <b>{formatEuro(Number(e.amount))}</b>
            </div>
            <div className="muted" style={{ fontSize: 13 }}>
              {formatDate(new Date(e.date))} · pagato da {e.payer_id === me ? 'te' : memberName(e.payer_id)} ·{' '}
              {e.expense_shares.length} {e.expense_shares.length === 1 ? 'persona' : 'persone'}
              {scope === 'all' ? ` · ${spaceById(e.space_id)?.name}` : ''}
              {e.event_id ? ' · collegata a un impegno' : ''}
            </div>
            {canWrite(e.space_id) && (
              <button className="btn ghost small" style={{ marginTop: 6 }} onClick={() => remove(e)}>
                Elimina
              </button>
            )}
          </div>
        ))}
      {expenses.length === 0 && <div className="empty">Nessuna spesa</div>}
    </div>
  );
}
