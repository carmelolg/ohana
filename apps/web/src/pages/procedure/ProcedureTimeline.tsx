import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TimelineList } from '../../components/timeline/TimelineList';
import { useContacts, useEventAttachments, useLinkedEvents, useSpace } from '../../lib/data';
import { openAttachment } from '../../lib/files';
import { procedureRows } from '../../lib/timeline';
import type { ProcedureStep } from '../../lib/types';

interface Props {
  procedureId: string;
  spaceId: string;
  steps: ProcedureStep[];
  /** Data degli impegni collegati ai passaggi, per id impegno. */
  eventDates: Map<string, string>;
  hue: number;
}

/** Cronologia della pratica: passaggi chiusi con la loro data e passaggi ancora da fare, nell'ordine dell'iter. */
export function ProcedureTimeline({ procedureId, spaceId, steps, eventDates, hue }: Props) {
  const { canWrite } = useSpace();
  const { data: linked = [] } = useLinkedEvents('procedure', procedureId);
  const { data: contacts = [] } = useContacts();
  const eventIds = useMemo(
    () => [
      ...new Set([...linked.map((e) => e.id), ...steps.flatMap((s) => (s.event_id ? [s.event_id] : []))]),
    ],
    [linked, steps],
  );
  const { data: files = [] } = useEventAttachments(eventIds);
  const rows = useMemo(
    () =>
      procedureRows(steps, eventDates, linked, {
        contactName: (id) => contacts.find((c) => c.id === id)?.name,
        eventFiles: (eventId) =>
          files
            .filter((f) => f.event_id === eventId)
            .map((f) => ({ id: f.id, label: `📎 ${f.name}`, onOpen: () => openAttachment(f.path) })),
      }),
    [steps, eventDates, linked, contacts, files],
  );
  return (
    <section aria-label="Cronologia della pratica">
      <div className="hstack" style={{ justifyContent: 'space-between', margin: '18px 8px 0' }}>
        <span className="label">Cronologia</span>
        {canWrite(spaceId) && (
          <Link
            className="pill"
            to={`/nuovo?pratica=${procedureId}`}
            aria-label="Aggiungi un impegno a questa pratica"
          >
            + Impegno
          </Link>
        )}
      </div>
      {rows.length > 0 && <TimelineList rows={rows} hue={hue} year={new Date().getFullYear()} />}
    </section>
  );
}
