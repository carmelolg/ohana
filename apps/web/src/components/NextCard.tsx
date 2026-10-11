import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { formatTime, MINUTE_MS } from '@ohana/shared';
import { useCareLabel, useSpace } from '../lib/data';
import { useEventActions } from '../lib/eventActions';
import type { Occurrence } from '../lib/types';
import { metaLine } from './occurrence/rowText';

/** «tra 25 min», «tra 2 h» o vuoto se l'orario è passato. */
export function untilLabel(at: Date, now: Date): string {
  const min = Math.round((at.getTime() - now.getTime()) / MINUTE_MS);
  if (min <= 0) {
    return '';
  }
  return min < 90 ? `tra ${min} min` : `tra ${Math.round(min / 60)} h`;
}

/** Il prossimo impegno di oggi: card scura con Fatto / Dettagli / Prepara visita. */
export function NextCard({ occ, now }: { occ: Occurrence; now: Date }) {
  const { spaceById, memberName, canWrite } = useSpace();
  const actions = useEventActions();
  const { event: ev } = occ;
  const careLabel = useCareLabel(ev.care_thread_id);
  const assignee = ev.assignee_id ? memberName(ev.assignee_id).split(' ')[0] : null;
  const until = ev.all_day ? '' : untilLabel(occ.at, now);
  const when = ev.all_day ? 'Tutto il giorno' : formatTime(occ.at);
  return (
    <section className="next-card" aria-label="Prossimo impegno">
      <div className="next-kicker">
        <span className="next-dot" />
        Prossimo · {when}
        {until && ` · ${until}`}
      </div>
      <div className="next-title">{ev.title}</div>
      <div className="next-meta">{metaLine(occ, spaceById(ev.space_id)?.name, assignee, careLabel)}</div>
      <div className="next-actions">
        {canWrite(ev.space_id) && (
          <button className="next-btn solid" onClick={() => void actions.done(ev)}>
            <Check size={18} strokeWidth={2} />
            Fatto
          </button>
        )}
        <Link className="next-btn" to={`/evento/${ev.id}`}>
          Dettagli
        </Link>
        {ev.categories?.slug === 'visita' && (
          <Link className="next-btn" to={`/evento/${ev.id}/prepara`}>
            Prepara visita
          </Link>
        )}
      </div>
    </section>
  );
}
