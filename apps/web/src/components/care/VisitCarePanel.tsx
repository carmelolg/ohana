import { Link } from 'react-router-dom';
import { useCareEntryForEvent } from '../../lib/data';
import type { EventRow } from '../../lib/types';

/** Al posto del diario 3d, per le visite di uno spazio con Cura: l'esito si registra nel filone. */
export function VisitCareOutcome({ ev, writable }: { ev: EventRow; writable: boolean }) {
  const { data: entry } = useCareEntryForEvent(ev.id);
  return (
    <section aria-label="Esito della visita" style={{ marginTop: 18 }}>
      <span className="label">Com’è andata</span>
      {entry ? (
        <p style={{ marginTop: 8 }}>
          Esito registrato nel filone.{' '}
          <Link to={`/cura/${entry.recipient_id}/filone/${entry.thread_id}`}>Apri il filone</Link>
        </p>
      ) : (
        <p className="muted" style={{ marginTop: 8 }}>
          {writable
            ? 'Registra cosa ha detto il medico: diventa un tassello del filone di cura.'
            : 'Nessun esito registrato.'}
        </p>
      )}
      {!entry && writable && (
        <Link className="btn accent small" to={`/cura/visita/${ev.id}`}>
          Registra l’esito
        </Link>
      )}
    </section>
  );
}
