import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { formatDayShort } from '@ohana/shared';
import { useSpace } from '../lib/data';
import { useEventActions } from '../lib/eventActions';
import type { Occurrence } from '../lib/types';

const DAY_MIN = 1440;

/** Impegno scaduto e ancora aperto: Fatto o A domani senza aprire il dettaglio. */
export function OverdueBanner({ occ }: { occ: Occurrence }) {
  const { canWrite } = useSpace();
  const actions = useEventActions();
  const { event: ev } = occ;
  return (
    <div className="overdue-banner" role="group" aria-label={`In ritardo: ${ev.title}`}>
      <Clock size={20} className="overdue-icon" aria-hidden />
      <Link to={`/evento/${ev.id}`} className="overdue-text">
        <b>{ev.title}</b>
        <span>In ritardo da {formatDayShort(occ.at)}</span>
      </Link>
      {canWrite(ev.space_id) && (
        <div className="overdue-actions">
          <button className="overdue-btn solid" onClick={() => void actions.done(ev)}>
            Fatto
          </button>
          <button className="overdue-btn" onClick={() => void actions.snooze(ev, DAY_MIN)}>
            A domani
          </button>
        </div>
      )}
    </div>
  );
}
