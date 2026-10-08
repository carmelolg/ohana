import { balancesForSpace, formatEuro } from '@ohana/shared';
import { useAuth } from '../../lib/auth';
import { fullName, spaceColor } from '../../lib/color';
import { useExpenses, useMutate, useSettlements, useSpace } from '../../lib/data';
import { useToast } from '../../lib/toast';
import type { Space } from '../../lib/types';
import { settleDebt } from './expenseCommands';

const amountClass = (v: number) => 'balance-amt ' + (v > 0 ? 'pos' : v < 0 ? 'neg' : 'muted');

/** Saldi per spazio: quanto deve dare o ricevere ciascuno e i pagamenti che pareggiano i conti. */
export function BalancesTab({ spaces }: { spaces: Space[] }) {
  const { session } = useAuth();
  const me = session?.user.id ?? '';
  const { memberName, canWrite } = useSpace();
  const { data: expenses = [] } = useExpenses();
  const { data: settlements = [] } = useSettlements();
  const mutate = useMutate();
  const toast = useToast();

  async function settle(spaceId: string, from: string, to: string, amount: number) {
    await settleDebt(mutate, spaceId, from, to, amount);
    toast('Segnato come saldato');
  }

  return (
    <>
      {spaces.map((space) => {
        const { net, transfers } = balancesForSpace(space.id, expenses, settlements);
        return (
          <section
            key={space.id}
            style={{ marginTop: 22, ['--space' as string]: spaceColor(space.color_hue) }}
          >
            <div className="label" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span className="dot" />
              {space.name}
            </div>
            <div className="group">
              {space.space_members.map((m) => {
                const v = net[m.user_id] ?? 0;
                return (
                  <div key={m.user_id} className="kv">
                    <span style={{ color: 'inherit' }}>{m.user_id === me ? 'Tu' : fullName(m.profiles)}</span>
                    <span className={amountClass(v)}>
                      {v > 0 ? '+' : ''}
                      {formatEuro(v)}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="label section-label">Per pareggiare</div>
            {transfers.length === 0 && <p className="muted">Tutto in pari.</p>}
            {transfers.map((t, i) => (
              <div key={i} className="kv">
                <span style={{ color: 'inherit' }}>
                  {t.from === me ? 'Tu' : memberName(t.from)} → {t.to === me ? 'te' : memberName(t.to)}
                </span>
                <span className="hstack">
                  <b>{formatEuro(t.amount)}</b>
                  {canWrite(space.id) && (t.from === me || t.to === me) && (
                    <button
                      className="btn ghost small"
                      onClick={() => settle(space.id, t.from, t.to, t.amount)}
                    >
                      Segna saldato
                    </button>
                  )}
                </span>
              </div>
            ))}
          </section>
        );
      })}
    </>
  );
}
