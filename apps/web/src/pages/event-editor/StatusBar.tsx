import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutate, useSpaceRecipients } from '../../lib/data';
import { isSingleVisit, useEventActions } from '../../lib/eventActions';
import { snoozeOptions } from '../../lib/snoozeOptions';
import type { EventForm } from './useEventForm';

export /** «Segna fatto» / «Riapri» e «Rimanda»: sempre visibili in cima a un impegno salvato (il link «Prepara la visita» sta in `VisitCareLink`). */
function StatusBar({ form }: { form: EventForm }) {
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
  return (
    <div className="status-bar">
      <div className="hstack" style={{ flexWrap: 'wrap' }}>
        {isOpen ? (
          <button className="btn ok small" onClick={markDone}>
            Segna fatto
          </button>
        ) : (
          <button className="btn ghost small" onClick={reopen}>
            Riapri
          </button>
        )}
        {isOpen && !existing.rrule && (
          <button
            className="btn ghost small"
            aria-expanded={snoozing}
            onClick={() => setSnoozing((on) => !on)}
          >
            Rimanda
          </button>
        )}
      </div>
      {snoozing && (
        <div className="chips-row" role="group" aria-label="Rimanda a">
          {snoozeOptions(new Date()).map((o) => (
            <button key={o.label} className="chip" onClick={() => void snooze(o.minutes)}>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
