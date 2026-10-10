import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TimelineList } from '../../components/timeline/TimelineList';
import { useLinkedEvents, useSpace } from '../../lib/data';
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
  const rows = useMemo(() => procedureRows(steps, eventDates, linked), [steps, eventDates, linked]);
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
