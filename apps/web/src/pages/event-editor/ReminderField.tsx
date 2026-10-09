import { Plus, X } from 'lucide-react';
import { newId } from '../../lib/outbox';
import { REMINDER_OPTIONS, reminderLabel, type ReminderDraft } from './reminders';

interface Props {
  reminders: ReminderDraft[];
  onChange: (next: ReminderDraft[]) => void;
}

/** Riga «Promemoria»: quando avvisare e su quali canali, con aggiunta e rimozione. */
export function ReminderField({ reminders, onChange }: Props) {
  const update = (index: number, patch: Partial<ReminderDraft>) =>
    onChange(reminders.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  return (
    <div className="kv reminder-kv">
      <span>Promemoria</span>
      <span className="reminder-list">
        {reminders.map((r, i) => (
          <span key={r.id + i} className="reminder-item">
            <select
              className="inline-select"
              aria-label="Quando avvisare"
              value={r.offset}
              onChange={(e) => update(i, { offset: Number(e.target.value) })}
            >
              {!REMINDER_OPTIONS.some(([v]) => v === r.offset) && (
                <option value={r.offset}>{reminderLabel(r.offset)}</option>
              )}
              {REMINDER_OPTIONS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="pill"
              aria-pressed={r.email}
              onClick={() => update(i, { email: !r.email })}
            >
              email
            </button>
            <button
              type="button"
              className="pill"
              aria-pressed={r.push}
              onClick={() => update(i, { push: !r.push })}
            >
              push
            </button>
            <button
              type="button"
              className="icon-btn"
              aria-label="Rimuovi promemoria"
              onClick={() => onChange(reminders.filter((_, j) => j !== i))}
            >
              <X size={18} />
            </button>
          </span>
        ))}
        <button
          type="button"
          className="pill reminder-add"
          onClick={() => onChange([...reminders, { id: newId(), offset: 60, email: true, push: true }])}
        >
          <Plus size={14} /> Promemoria
        </button>
      </span>
    </div>
  );
}
