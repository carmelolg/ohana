import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TimelineList } from '../../components/timeline/TimelineList';
import { useContacts, useLinkedEvents, useMaintenanceLog, useSpace } from '../../lib/data';
import { maintenanceRows } from '../../lib/timeline';
import type { Maintenance } from '../../lib/types';

/** Storia di una manutenzione (caldaia, auto…): scadenza in programma in cima, poi ogni intervento già eseguito. */
export function MaintenanceTimeline({ maintenance: m }: { maintenance: Maintenance }) {
  const { spaceById, canWrite } = useSpace();
  const { data: log = [] } = useMaintenanceLog(m.id);
  const { data: contacts = [] } = useContacts();
  const { data: linked = [] } = useLinkedEvents('maintenance', m.id);
  const rows = useMemo(
    () => maintenanceRows(m, log, (id) => contacts.find((c) => c.id === id)?.name, linked),
    [m, log, contacts, linked],
  );
  return (
    <section aria-label="Storico interventi">
      <div className="hstack" style={{ justifyContent: 'space-between' }}>
        <span className="label">Storico</span>
        {canWrite(m.space_id) && (
          <Link
            className="pill"
            to={`/nuovo?manutenzione=${m.id}`}
            aria-label="Aggiungi un impegno a questa manutenzione"
          >
            + Impegno
          </Link>
        )}
      </div>
      {rows.length > 0 ? (
        <TimelineList
          rows={rows}
          hue={spaceById(m.space_id)?.color_hue ?? 42}
          year={new Date().getFullYear()}
        />
      ) : (
        <p className="muted">Nessun intervento registrato.</p>
      )}
    </section>
  );
}
