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
      <div className="proc-head">
        <span className="muted proc-sub">
          <span className="dot" />
          {subtitleOf(spaceName, ownerName)}
        </span>
        <h2 className="proc-title">{p.title}</h2>
        {p.status !== 'in_corso' && (
          <span className="badge">{p.status === 'completata' ? 'COMPLETATA' : 'ARCHIVIATA'}</span>
        )}
      </div>
      <div className="proc-progress">
        <div className="proc-progress-text">
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
