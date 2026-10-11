import { useMemo } from 'react';
import { formatEuro } from '@ohana/shared';
import { useContacts } from '../../lib/data';
import type { ProcedureStep } from '../../lib/types';
import { euroShort, quotesOf, totalCents } from './phases';

const OUTCOME_LABEL = { scelto: 'Scelto', scartato: 'Scartato' } as const;

/** «Preventivi a confronto» e totale delle fasi: compare solo se almeno una fase ha un importo o un esito. */
export function PhaseSummary({ steps }: { steps: ProcedureStep[] }) {
  const { data: contacts = [] } = useContacts();
  const quotes = useMemo(() => quotesOf(steps), [steps]);
  const total = totalCents(steps);
  if (quotes.length === 0 && total === 0) {
    return null;
  }
  return (
    <section className="phase-summary" aria-label="Preventivi e costi">
      {quotes.length > 0 && (
        <>
          <span className="label">Preventivi a confronto</span>
          {quotes.map((q) => (
            <div key={q.id} className={'quote-row ' + q.quote_outcome}>
              <span className="quote-who">
                <b>{contacts.find((c) => c.id === q.contact_id)?.name ?? q.title}</b>
                {q.amount != null && <span className="muted"> · {euroShort(Number(q.amount))}</span>}
              </span>
              <span className="quote-tag">{q.quote_outcome && OUTCOME_LABEL[q.quote_outcome]}</span>
            </div>
          ))}
        </>
      )}
      {total > 0 && (
        <div className="kv">
          <span>Costo previsto</span>
          <span>{formatEuro(total / 100)}</span>
        </div>
      )}
    </section>
  );
}
