import { Plus, X } from 'lucide-react';
import type { CareExemption } from '../../lib/types';

/** Esenzioni della persona: codice, descrizione e (se non è permanente) la scadenza. */
export function ExemptionsField({
  value,
  onChange,
}: {
  value: CareExemption[];
  onChange: (next: CareExemption[]) => void;
}) {
  const edit = (i: number, patch: Partial<CareExemption>) =>
    onChange(value.map((e, j) => (j === i ? { ...e, ...patch } : e)));
  return (
    <div className="stack">
      <span className="label">Esenzioni</span>
      {value.map((e, i) => (
        <div key={i} className="stack" role="group" aria-label={`Esenzione ${i + 1}`}>
          <div className="hstack">
            <input
              className="input"
              style={{ maxWidth: 90 }}
              placeholder="Codice"
              aria-label="Codice"
              value={e.code ?? ''}
              onChange={(ev) => edit(i, { code: ev.target.value })}
            />
            <input
              className="input"
              placeholder="Descrizione"
              aria-label="Descrizione"
              value={e.label}
              onChange={(ev) => edit(i, { label: ev.target.value })}
            />
            <button
              type="button"
              className="icon-btn"
              aria-label={`Togli l'esenzione ${i + 1}`}
              onClick={() => onChange(value.filter((_, j) => j !== i))}
            >
              <X size={18} />
            </button>
          </div>
          <label className="hstack muted" style={{ fontSize: 13 }}>
            Scade il (vuoto = permanente)
            <input
              className="input"
              type="date"
              value={e.expires_at ?? ''}
              onChange={(ev) => edit(i, { expires_at: ev.target.value || null })}
            />
          </label>
        </div>
      ))}
      <button
        type="button"
        className="btn ghost small"
        onClick={() => onChange([...value, { label: '', expires_at: null }])}
      >
        <Plus size={16} /> Esenzione
      </button>
    </div>
  );
}
