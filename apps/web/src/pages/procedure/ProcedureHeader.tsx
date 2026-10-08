import { ProgressBar } from '../../components/ProgressBar';
import type { Procedure } from '../../lib/types';

const DAY_MON = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', day: 'numeric', month: 'short' });

interface Props {
  procedure: Procedure;
  spaceName: string | undefined;
  ownerName: string | null;
  done: number;
  total: number;
}

/** «Spazio · segue Nome» (solo il nome di battesimo), se c'è qualcosa da mostrare. */
export const subtitleOf = (spaceName: string | undefined, ownerName: string | null): string =>
  [spaceName, ownerName ? `segue ${ownerName.split(' ')[0]}` : null].filter(Boolean).join(' · ');

/** Titolo della pratica, stato e barra di avanzamento. */
export function ProcedureHeader({ procedure: p, spaceName, ownerName, done, total }: Props) {
  return (
    <>
      <div style={{ paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span
          className="muted"
          style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <span className="dot" />
          {subtitleOf(spaceName, ownerName)}
        </span>
        <h2 style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-.02em', lineHeight: 1.1 }}>{p.title}</h2>
        {p.status !== 'in_corso' && (
          <span className="badge">{p.status === 'completata' ? 'COMPLETATA' : 'ARCHIVIATA'}</span>
        )}
      </div>
      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
          <b>
            {done} di {total} passaggi
          </b>
          {p.due_date && (
            <span className="muted">scadenza {DAY_MON.format(new Date(p.due_date + 'T09:00:00'))}</span>
          )}
        </div>
        <ProgressBar value={done} max={total} />
      </div>
    </>
  );
}
