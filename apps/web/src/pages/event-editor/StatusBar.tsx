import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlarmClock, Check, ClipboardList, RotateCcw } from 'lucide-react';
import { useMutate, useSpaceRecipients } from '../../lib/data';
import { isSingleVisit, useEventActions } from '../../lib/eventActions';
import { snoozeOptions } from '../../lib/snoozeOptions';
import type { EventForm } from './useEventForm';

/** Azioni sull'impegno salvato, subito sotto il titolo: «Segna fatto» (o «Riapri») in evidenza, poi «Rimanda» e, per una visita con Cura, «Prepara la visita». */
export function StatusBar({ form }: { form: EventForm }) {
  const mutate = useMutate();
  const actions = useEventActions();
  const nav = useNavigate();
  const [snoozing, setSnoozing] = useState(false);
  const { existing, back } = form;
  const hasCare = useSpaceRecipients(existing?.space_id).length > 0;
  if (!existing) {
    return null;
  }
  const isOpen = existing.status === 'open';
  const reopen = async () => {
    await mutate({
      table: 'events',
      action: 'update',
      payload: { status: 'open' },
      match: { id: existing.id },
    });
    back();
  };
  const markDone = async () => {
    await actions.done(existing);
    if (!isSingleVisit(existing)) {
      return back();
    }
    // visita fatta: si va dritti a «Com'è andata» (con cura, l'esito è un tassello del filone; senza, il diario resta qui)
    if (hasCare) {
      nav(`/cura/visita/${existing.id}`, { replace: true });
    }
  };
  const snooze = async (minutes: number) => {
    await actions.snooze(existing, minutes);
    back();
  };
  const canPrepareVisit = isOpen && !!existing.care_thread_id;
  return (
    <section className="event-actions" aria-label="Azioni sull’impegno">
      {isOpen ? (
        <button type="button" className="btn accent event-actions-main" onClick={markDone}>
          <Check size={18} aria-hidden /> Segna fatto
        </button>
      ) : (
        <button type="button" className="btn ghost event-actions-main" onClick={reopen}>
          <RotateCcw size={16} aria-hidden /> Riapri
        </button>
      )}
      {isOpen && !existing.rrule && (
        <button
          type="button"
          className="btn ghost small"
          aria-expanded={snoozing}
          onClick={() => setSnoozing((on) => !on)}
        >
          <AlarmClock size={16} aria-hidden /> Rimanda
        </button>
      )}
      {canPrepareVisit && (
        <Link className="btn ghost small" to={`/evento/${existing.id}/prepara`}>
          <ClipboardList size={16} aria-hidden /> Prepara la visita
        </Link>
      )}
      {snoozing && (
        <div className="chips-row event-actions-snooze" role="group" aria-label="Rimanda a">
          {snoozeOptions(new Date()).map((o) => (
            <button type="button" key={o.label} className="chip" onClick={() => void snooze(o.minutes)}>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
