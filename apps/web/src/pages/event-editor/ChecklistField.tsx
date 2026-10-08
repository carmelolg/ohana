import { Plus, X } from 'lucide-react';
import { newId } from '../../lib/outbox';
import type { ChecklistItem } from '../../lib/types';

interface Props {
  items: ChecklistItem[];
  eventId: string;
  onChange: (next: ChecklistItem[]) => void;
}

/** Checklist dell'impegno («portare tessera sanitaria», «a digiuno»…). */
export function ChecklistField({ items, eventId, onChange }: Props) {
  const update = (index: number, patch: Partial<ChecklistItem>) =>
    onChange(items.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  return (
    <div style={{ marginTop: 14 }}>
      <div className="label">Checklist</div>
      {items.map((c, i) => (
        <div key={c.id} className="item">
          <button
            type="button"
            className="check"
            aria-label="Spunta"
            onClick={() => update(i, { checked: !c.checked })}
          >
            <span
              className="box"
              style={
                c.checked
                  ? { background: 'var(--accent-fill)', borderColor: 'var(--accent-fill)' }
                  : undefined
              }
            >
              {c.checked ? '✓' : ''}
            </span>
          </button>
          <input
            className="txt"
            style={{ border: 0, background: 'transparent', minHeight: 44, fontSize: 16 }}
            value={c.text}
            aria-label={`Voce ${i + 1}`}
            onChange={(e) => update(i, { text: e.target.value })}
          />
          <button
            type="button"
            className="icon-btn"
            aria-label="Rimuovi voce"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
          >
            <X size={18} />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="pill"
        onClick={() =>
          onChange([
            ...items,
            { id: newId(), event_id: eventId, text: '', checked: false, position: items.length },
          ])
        }
      >
        <Plus size={14} /> Voce
      </button>
    </div>
  );
}
