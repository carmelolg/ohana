import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDayShort, formatTime } from '@ohana/shared';
import { toOccurrences, useContacts, useEventWindow, useSpace } from '../lib/data';
import { Sheet } from './ui';

export function SearchSheet({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('');
  const nav = useNavigate();
  const { selected } = useSpace();
  const { data: events = [], from, to } = useEventWindow();
  const { data: contacts = [] } = useContacts();
  const n = q.trim().toLowerCase();
  const occ = useMemo(
    () =>
      n
        ? toOccurrences(events, from, to, selected)
            .filter(
              (o) =>
                o.event.title.toLowerCase().includes(n) || (o.event.notes ?? '').toLowerCase().includes(n),
            )
            .slice(0, 12)
        : [],
    [n, events, from, to, selected],
  );
  const cs = n
    ? contacts
        .filter((c) => c.name.toLowerCase().includes(n) || (c.role ?? '').toLowerCase().includes(n))
        .slice(0, 6)
    : [];
  return (
    <Sheet onClose={onClose} label="Cerca">
      <input
        className="input"
        autoFocus
        placeholder="Cerca impegni e contatti…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Cerca"
      />
      {occ.map((o) => (
        <button
          key={o.key}
          className="sheet-row"
          onClick={() => {
            onClose();
            nav(`/evento/${o.event.id}`);
          }}
        >
          <span className="mono muted" style={{ width: 90, fontSize: 12 }}>
            {formatDayShort(o.at)}
            <br />
            {formatTime(o.at)}
          </span>
          <b>{o.event.title}</b>
        </button>
      ))}
      {cs.map((c) => (
        <button
          key={c.id}
          className="sheet-row"
          onClick={() => {
            onClose();
            nav('/rubrica');
          }}
        >
          <span className="label" style={{ width: 90 }}>
            Contatto
          </span>
          <b>{c.name}</b>
          <span className="muted">{c.role}</span>
        </button>
      ))}
      {n && occ.length + cs.length === 0 && <p className="empty">Nessun risultato</p>}
    </Sheet>
  );
}
