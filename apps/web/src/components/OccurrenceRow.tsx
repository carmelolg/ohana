import { Link } from 'react-router-dom';
import { Check, Clock } from 'lucide-react';
import { formatEuro } from '@ohana/shared';
import { spaceColor } from '../lib/color';
import { useSpace } from '../lib/data';
import { useEventActions } from '../lib/eventActions';
import type { EventRow, Occurrence } from '../lib/types';
import { SwipeBackground } from './occurrence/SwipeBackground';
import { metaLine, isDeadline, timeColumn } from './occurrence/rowText';
import { useSwipe } from './occurrence/useSwipe';

interface QuickActionsProps {
  event: EventRow;
  onDone: () => void;
  onSnooze: () => void;
}

/** «Fatto» e «Rimanda» come pulsanti, per tastiera e screen reader (sul telefono si usa lo swipe). */
function QuickActions({ event, onDone, onSnooze }: QuickActionsProps) {
  const act = (fn: () => void) => (e: React.MouseEvent) => {
    e.preventDefault(); // il pulsante sta dentro il link che apre l'impegno
    fn();
  };
  return (
    <span className="row-actions" style={{ display: 'flex' }}>
      <button className="icon-btn" aria-label={`Segna fatto: ${event.title}`} onClick={act(onDone)}>
        <Check size={20} strokeWidth={1.75} />
      </button>
      <button className="icon-btn" aria-label={`Rimanda: ${event.title}`} onClick={act(onSnooze)}>
        <Clock size={20} strokeWidth={1.75} />
      </button>
    </span>
  );
}

/** Una riga della lista impegni: orario, titolo, dettagli; swipe a destra = fatto, a sinistra = rimanda. */
export function OccurrenceRow({ occ, showDay }: { occ: Occurrence; showDay?: string }) {
  const { spaceById, memberName, canWrite } = useSpace();
  const actions = useEventActions();
  const { event: ev } = occ;
  const space = spaceById(ev.space_id);
  const writable = canWrite(ev.space_id);
  const swipe = useSwipe({
    enabled: writable,
    onRight: () => void actions.done(ev),
    onLeft: () => void actions.snooze(ev),
  });
  const assignee = ev.assignee_id ? memberName(ev.assignee_id).split(' ')[0] : null;

  return (
    <div className="row swipe" style={{ borderTop: '1px solid var(--line)', padding: 0 }}>
      <SwipeBackground dx={swipe.dx} />
      <Link
        to={`/evento/${ev.id}`}
        className={'row' + (ev.status === 'done' ? ' done' : '')}
        style={{
          transform: `translateX(${swipe.dx}px)`,
          transition: swipe.dx === 0 ? 'transform .2s' : 'none',
          borderTop: 0,
          width: '100%',
          ['--space' as string]: spaceColor(space?.color_hue),
        }}
        {...swipe.handlers}
        onPointerCancel={swipe.handlers.onPointerUp}
        onClick={(e) => swipe.wasDragged() && e.preventDefault()}
      >
        <span className={'time' + (isDeadline(occ) ? ' due' : '')}>{timeColumn(occ, showDay)}</span>
        <span className="body">
          <span className="title">
            {ev.title}
            {ev.amount ? ` · ${formatEuro(Number(ev.amount))}` : ''}
          </span>
          <span className="meta">
            <span className="dot" />
            {metaLine(occ, space?.name, assignee)}
          </span>
        </span>
        {writable && ev.status === 'open' && (
          <QuickActions
            event={ev}
            onDone={() => void actions.done(ev)}
            onSnooze={() => void actions.snooze(ev)}
          />
        )}
      </Link>
    </div>
  );
}
