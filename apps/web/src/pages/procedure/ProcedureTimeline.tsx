import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TimelineList } from '../../components/timeline/TimelineList';
import { useAttachmentsByIds, useContacts, useLinkedEvents, useSpace } from '../../lib/data';
import { procedureRows } from '../../lib/timeline';
import { openAttachment } from '../../lib/files';
import type { Procedure, ProcedureStep } from '../../lib/types';

interface Props {
  procedureId: string;
  spaceId: string;
  steps: ProcedureStep[];
  /** Data degli impegni collegati ai passaggi, per id impegno. */
  eventDates: Map<string, string>;
  hue: number;
  /** Documenti della pratica: quelli legati a una fase compaiono come chip sulla sua riga. */
  docs: Procedure['procedure_docs'];
}

/** Cronologia della pratica: passaggi chiusi con la loro data e passaggi ancora da fare, nell'ordine dell'iter. */
export function ProcedureTimeline({ procedureId, spaceId, steps, eventDates, hue, docs }: Props) {
  const { canWrite } = useSpace();
  const { data: linked = [] } = useLinkedEvents('procedure', procedureId);
  const { data: contacts = [] } = useContacts();
  const { data: atts = [] } = useAttachmentsByIds(
    docs.filter((d) => d.step_id && d.attachment_id).map((d) => d.attachment_id as string),
  );
  const rows = useMemo(
    () =>
      procedureRows(steps, eventDates, linked, {
        contactName: (id) => contacts.find((c) => c.id === id)?.name,
        chipsOf: (stepId) =>
          docs
            .filter((d) => d.step_id === stepId)
            .map((d) => {
              const path = atts.find((a) => a.id === d.attachment_id)?.path;
              return { id: d.id, label: `📎 ${d.name}`, onOpen: () => path && void openAttachment(path) };
            }),
      }),
    [steps, eventDates, linked, contacts, docs, atts],
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
