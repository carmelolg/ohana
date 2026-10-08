import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { formatDate } from '@ohana/shared';
import { useAuth } from '../../lib/auth';
import { useCategories, useFollowUps, useMutate } from '../../lib/data';
import { useToast } from '../../lib/toast';
import type { EventRow, FollowUp } from '../../lib/types';
import { ReminderSheet } from './ReminderSheet';
import { addFollowUp, createFollowUpReminder, deleteFollowUp } from './visitCommands';

const dueDateLabel = (f: FollowUp) =>
  f.due_hint ?? (f.due_date ? formatDate(new Date(f.due_date + 'T09:00:00')) : '');

/** Testo pre-compilato per «Crea impegno» dal prossimo passo. */
function eventTextFor(f: FollowUp): string {
  if (f.due_date) {
    return `${f.title} entro il ${formatDate(new Date(f.due_date + 'T09:00:00'))}`;
  }
  if (f.due_hint) {
    return `${f.title} ${f.due_hint.split('·')[0].trim()}`;
  }
  return f.title;
}

interface RowProps {
  followUp: FollowUp;
  writable: boolean;
  onCreateEvent: () => void;
  onReminder: () => void;
  onDelete: () => void;
}

const ROW_STYLE = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
  padding: '12px 0',
  borderBottom: '1px solid var(--line)',
} as const;

function FollowUpRow({ followUp: f, writable, onCreateEvent, onReminder, onDelete }: RowProps) {
  const open = writable && !f.created_event_id;
  return (
    <div style={ROW_STYLE}>
      <div style={{ flex: '1 1 160px', minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>{f.title}</div>
        <div className="muted" style={{ fontSize: 13 }}>
          {dueDateLabel(f)}
        </div>
      </div>
      {f.created_event_id && (
        <Link
          to={`/evento/${f.created_event_id}`}
          className="pill"
          style={{ textDecoration: 'none', color: 'var(--accent-ink)' }}
        >
          ✓ nel calendario
        </Link>
      )}
      {open && (
        <div className="hstack" style={{ gap: 6 }}>
          <button
            className="pill"
            style={{ background: 'var(--bg)' }}
            onClick={onCreateEvent}
            aria-label={`Crea impegno: ${f.title}`}
          >
            Crea impegno
          </button>
          <button
            className="pill"
            style={{ background: 'var(--bg)' }}
            onClick={onReminder}
            aria-label={`Promemoria: ${f.title}`}
          >
            Promemoria
          </button>
        </div>
      )}
      {open && (
        <button
          className="icon-btn"
          style={{ minWidth: 36 }}
          aria-label={`Elimina ${f.title}`}
          onClick={onDelete}
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
}

function NewFollowUpForm({ onAdd }: { onAdd: (title: string, hint: string) => void }) {
  const [title, setTitle] = useState('');
  const [hint, setHint] = useState('');
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      return;
    }
    onAdd(title.trim(), hint);
    setTitle('');
    setHint('');
  };
  return (
    <form className="stack" style={{ marginTop: 10 }} onSubmit={submit}>
      <input
        className="input"
        aria-label="Nuovo passo"
        placeholder="Es. Holter 24 h"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <div className="hstack">
        <input
          className="input"
          aria-label="Quando"
          placeholder="Quando? es. entro 31 dic · da prenotare"
          value={hint}
          onChange={(e) => setHint(e.target.value)}
        />
        <button className="btn small" type="submit" disabled={!title.trim()}>
          Aggiungi
        </button>
      </div>
    </form>
  );
}

/** Prossimi passi dopo la visita, trasformabili in impegni o promemoria con un tocco. */
export function FollowUps({ visit: ev, writable }: { visit: EventRow; writable: boolean }) {
  const { session } = useAuth();
  const nav = useNavigate();
  const mutate = useMutate();
  const toast = useToast();
  const { data: followUps = [] } = useFollowUps(ev.id);
  const { data: categories = [] } = useCategories();
  const [reminderFor, setReminderFor] = useState<FollowUp | null>(null);

  async function saveReminder(followUp: FollowUp, date: string) {
    const categoryId = categories.find((c) => c.space_id === ev.space_id && c.slug === 'altro')?.id;
    const params = { visit: ev, followUp, date, userId: session!.user.id, categoryId };
    if (await createFollowUpReminder(mutate, params)) {
      toast('Promemoria creato');
      setReminderFor(null);
    }
  }

  return (
    <>
      <div className="label" style={{ margin: '18px 4px 8px' }}>
        Prossimi passi
      </div>
      <div className="card" style={{ padding: '4px 16px' }}>
        {followUps.map((f) => (
          <FollowUpRow
            key={f.id}
            followUp={f}
            writable={writable}
            onCreateEvent={() =>
              nav(`/nuovo?${new URLSearchParams({ text: eventTextFor(f), followup: f.id })}`)
            }
            onReminder={() => setReminderFor(f)}
            onDelete={() => void deleteFollowUp(mutate, f.id)}
          />
        ))}
        {followUps.length === 0 && (
          <p className="muted" style={{ padding: '12px 0', fontSize: 14 }}>
            Nessun passo da fare.
          </p>
        )}
      </div>
      {writable && <NewFollowUpForm onAdd={(title, hint) => void addFollowUp(mutate, ev.id, title, hint)} />}
      {reminderFor && (
        <ReminderSheet
          followUp={reminderFor}
          onClose={() => setReminderFor(null)}
          onSave={(date) => void saveReminder(reminderFor, date)}
        />
      )}
    </>
  );
}
