import { Plus, X } from 'lucide-react';

const DEFAULT_NEW_SLOT = '12:00';

/** Orari di assunzione: uno o più, ciascuno con il suo campo ora. */
export function ScheduleField({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  return (
    <div className="stack">
      <span className="label">Orari</span>
      {value.map((slot, i) => (
        <div key={i} className="hstack">
          <input
            className="input"
            type="time"
            aria-label={`Orario ${i + 1}`}
            value={slot}
            onChange={(e) => onChange(value.map((s, j) => (j === i ? e.target.value : s)))}
          />
          <button
            type="button"
            className="icon-btn"
            aria-label={`Togli l'orario ${i + 1}`}
            onClick={() => onChange(value.filter((_, j) => j !== i))}
          >
            <X size={18} />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn ghost small"
        onClick={() => onChange([...value, DEFAULT_NEW_SLOT])}
      >
        <Plus size={16} /> Orario
      </button>
      {value.length === 0 && <span className="muted">Senza orari è una terapia «al bisogno».</span>}
    </div>
  );
}
