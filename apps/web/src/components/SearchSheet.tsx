import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDayShort, formatTime } from '@ohana/shared';
import { toOccurrences, useContacts, useDocuments, useEventWindow, useFeatures, useSpace } from '../lib/data';
import { searchFunctions } from './search/functions';
import { Sheet } from './ui';

interface ResultProps {
  kind: string;
  to: string;
  onGo: (to: string) => void;
  detail?: string | null;
  children: React.ReactNode;
}

function ResultRow({ kind, to, onGo, detail, children }: ResultProps) {
  return (
    <button className="sheet-row" onClick={() => onGo(to)}>
      <span className="label" style={{ width: 90 }}>
        {kind}
      </span>
      <b>{children}</b>
      {detail && <span className="muted">{detail}</span>}
    </button>
  );
}

export function SearchSheet({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('');
  const nav = useNavigate();
  const { selected } = useSpace();
  const { data: events = [], from, to } = useEventWindow();
  const { data: contacts = [] } = useContacts();
  const { data: documents = [] } = useDocuments();
  const isOn = useFeatures();
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
  const docs = n ? documents.filter((d) => d.title.toLowerCase().includes(n)).slice(0, 6) : [];
  const funcs = searchFunctions(q, isOn);
  const go = (to: string) => {
    onClose();
    nav(to);
  };
  return (
    <Sheet onClose={onClose} label="Cerca">
      <input
        className="input"
        autoFocus
        placeholder="Cerca in tutta Ohana…"
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
        <ResultRow key={c.id} kind="Contatto" to="/rubrica" onGo={go} detail={c.role}>
          {c.name}
        </ResultRow>
      ))}
      {docs.map((d) => (
        <ResultRow key={d.id} kind="Documento" to="/documenti" onGo={go}>
          {d.title}
        </ResultRow>
      ))}
      {funcs.map((f) => (
        <ResultRow key={f.to} kind="Funzione" to={f.to} onGo={go}>
          {f.label}
        </ResultRow>
      ))}
      {n && occ.length + cs.length + docs.length + funcs.length === 0 && (
        <p className="empty">Nessun risultato</p>
      )}
    </Sheet>
  );
}
