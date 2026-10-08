import { useState } from 'react';
import { Sheet } from '../ui';
import type { FollowUp } from '../../lib/types';

interface Props {
  followUp: FollowUp;
  onClose: () => void;
  onSave: (date: string) => void;
}

/** Sceglie il giorno in cui ricordare un prossimo passo. */
export function ReminderSheet({ followUp, onClose, onSave }: Props) {
  const [date, setDate] = useState(followUp.due_date ?? '');
  return (
    <Sheet onClose={onClose} label="Promemoria">
      <div className="stack">
        <h3 style={{ fontSize: 20 }}>Promemoria: {followUp.title}</h3>
        <p className="muted" style={{ fontSize: 14 }}>
          Ti avviso quel giorno, senza ora precisa. {followUp.due_hint ? `(${followUp.due_hint})` : ''}
        </p>
        <input
          className="input"
          type="date"
          aria-label="Giorno del promemoria"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <div className="hstack">
          <button className="btn ghost" style={{ flex: 1 }} onClick={onClose}>
            Annulla
          </button>
          <button className="btn accent" style={{ flex: 1 }} onClick={() => onSave(date)} disabled={!date}>
            Crea promemoria
          </button>
        </div>
      </div>
    </Sheet>
  );
}
