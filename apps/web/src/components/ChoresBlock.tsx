import { useState } from 'react';
import { choresForToday } from '@ohana/shared';
import { useAuth } from '../lib/auth';
import { useSpace } from '../lib/data';
import { useEventActions } from '../lib/eventActions';
import { readStorage, writeStorage } from '../lib/storage';
import type { EventRow } from '../lib/types';
import { ChoreRow } from './chores/ChoreRow';
import { ChoresFilter } from './chores/ChoresFilter';

const FILTER_KEY = 'ohana-chores-filter';

/** Faccende (3a): lista compatta con casella, separata dagli impegni con orario. Le non fatte passano al giorno dopo senza diventare urgenti. */
export function ChoresBlock({ chores, today }: { chores: EventRow[]; today: Date }) {
  const { session } = useAuth();
  const { memberProfile, canWrite } = useSpace();
  const actions = useEventActions();
  const [mineOnly, setMineOnly] = useState(() => readStorage(FILTER_KEY) !== 'tutte');
  if (chores.length === 0) {
    return null;
  }

  const scoped = mineOnly ? chores.filter((c) => c.assignee_id === session?.user.id) : chores;
  const { items, done, total } = choresForToday(scoped, today);
  const changeFilter = (value: boolean) => {
    setMineOnly(value);
    writeStorage(FILTER_KEY, value ? 'mie' : 'tutte');
  };

  return (
    <section
      aria-label="Faccende"
      style={{ margin: '18px -8px 0', padding: '6px 16px', borderRadius: 16, background: 'var(--surface-2)' }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          padding: '8px 0 2px',
        }}
      >
        <div className="label">
          Faccende · {done} di {total}
        </div>
        <ChoresFilter mineOnly={mineOnly} onChange={changeFilter} />
      </div>
      {items.length === 0 && (
        <p className="muted" style={{ padding: '6px 0 12px', fontSize: 14 }}>
          Nessuna faccenda per oggi.
        </p>
      )}
      {items.map((item) => (
        <ChoreRow
          key={item.chore.id}
          item={item}
          assignee={memberProfile(item.chore.assignee_id)}
          writable={canWrite(item.chore.space_id)}
          onToggle={() =>
            void (item.state === 'done' ? actions.undoChore(item.chore, today) : actions.done(item.chore))
          }
        />
      ))}
      <div style={{ height: 6 }} />
    </section>
  );
}
