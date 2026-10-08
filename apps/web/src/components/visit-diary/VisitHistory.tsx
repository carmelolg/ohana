import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatNumericDate } from '@ohana/shared';
import { useVisitHistory } from '../../lib/data';
import type { EventRow } from '../../lib/types';

/** Storico delle visite con lo stesso professionista. */
export function VisitHistory({ visit: ev }: { visit: EventRow }) {
  const { data: history = [] } = useVisitHistory(ev.contact_id);
  const [open, setOpen] = useState(false);
  const doctor = ev.contacts?.name;
  if (!ev.contact_id || !doctor) {
    return null;
  }

  const done = history.filter((h) => h.status === 'done' || new Date(h.starts_at) < new Date());
  const last = done.find((h) => h.id !== ev.id);
  return (
    <div style={{ marginTop: 16 }}>
      <button className="btn ghost small" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        Storico con {doctor}: {done.length} {done.length === 1 ? 'visita' : 'visite'}
        {last ? ` · ultima ${formatNumericDate(new Date(last.starts_at))}` : ''} ›
      </button>
      {open && (
        <div className="card" style={{ marginTop: 8, padding: '4px 16px' }}>
          {history.map((h) => (
            <Link
              key={h.id}
              to={`/evento/${h.id}`}
              className="kv"
              style={{ color: 'inherit', textDecoration: 'none' }}
            >
              <span style={{ color: 'inherit' }}>{h.title}</span>
              <span className="mono muted" style={{ fontSize: 12 }}>
                {formatNumericDate(new Date(h.starts_at))}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
