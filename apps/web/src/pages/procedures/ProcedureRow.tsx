import { Link } from 'react-router-dom';
import { spaceColor } from '../../lib/color';
import type { Procedure, Space } from '../../lib/types';

const DAY_MON = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', day: 'numeric', month: 'short' });

/** Percentuale di passaggi completati (0 se la pratica non ne ha). */
export const progressPercent = (done: number, total: number): number => (total ? (done / total) * 100 : 0);

interface Props {
  procedure: Procedure;
  space: Space | undefined;
  /** Nome per esteso del responsabile, se c'è. */
  ownerName: string | null;
}

/** Una pratica nell'elenco: titolo, spazio, responsabile, avanzamento e scadenza. */
export function ProcedureRow({ procedure: p, space, ownerName }: Props) {
  const total = p.procedure_steps.length;
  const done = p.procedure_steps.filter((s) => s.done_at).length;
  const meta = [
    space?.name,
    ownerName ? `segue ${ownerName.split(' ')[0]}` : null,
    `${done} di ${total} passaggi`,
  ];
  return (
    <Link
      to={`/pratiche/${p.id}`}
      className="row"
      style={{ alignItems: 'center' }}
      aria-label={`${p.title}, ${done} di ${total} passaggi`}
    >
      <span className="body">
        <span className="title">{p.title}</span>
        <span className="meta">
          <span className="dot" style={{ background: spaceColor(space?.color_hue) }} />
          {meta.filter(Boolean).join(' · ')}
        </span>
        <span
          style={{
            height: 4,
            borderRadius: 2,
            background: 'var(--surface-2)',
            overflow: 'hidden',
            marginTop: 4,
          }}
          aria-hidden
        >
          <span
            style={{
              display: 'block',
              height: '100%',
              width: `${progressPercent(done, total)}%`,
              background: 'var(--accent)',
            }}
          />
        </span>
      </span>
      {p.due_date && (
        <span className="mono muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
          {DAY_MON.format(new Date(p.due_date + 'T09:00:00')).toUpperCase()}
        </span>
      )}
    </Link>
  );
}
