import { Plus, X } from 'lucide-react';
import { Field } from '../Field';
import { NEXT_CHECK_OPTIONS, type VisitFollowUp } from '../../lib/api/careVisit';

interface Props {
  months: number | null;
  onMonths: (months: number | null) => void;
  followUps: VisitFollowUp[];
  onFollowUps: (next: VisitFollowUp[]) => void;
}

/** Prossimo controllo (crea un promemoria) e altri prossimi passi, con o senza data. */
export function NextStepsField({ months, onMonths, followUps, onFollowUps }: Props) {
  const edit = (i: number, patch: Partial<VisitFollowUp>) =>
    onFollowUps(followUps.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  return (
    <div className="stack">
      <span className="label">Prossimo controllo</span>
      <label className="hstack">
        Esami + visita tra
        <select
          className="inline-select chip"
          aria-label="Tra quanti mesi"
          value={months ?? ''}
          onChange={(e) => onMonths(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">— nessun promemoria</option>
          {NEXT_CHECK_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {m} {m === 1 ? 'mese' : 'mesi'}
            </option>
          ))}
        </select>
      </label>
      {followUps.map((f, i) => (
        <div key={i} className="stack" role="group" aria-label={`Passo ${i + 1}`}>
          <div className="hstack">
            <input
              className="input"
              placeholder="Es. Holter 24 h"
              aria-label="Cosa fare"
              value={f.title}
              onChange={(e) => edit(i, { title: e.target.value })}
            />
            <button
              type="button"
              className="icon-btn"
              aria-label={`Togli il passo ${i + 1}`}
              onClick={() => onFollowUps(followUps.filter((_, j) => j !== i))}
            >
              <X size={18} />
            </button>
          </div>
          <Field label="Entro quando (facoltativo)">
            <input
              className="input"
              type="date"
              value={f.dueDate}
              onChange={(e) => edit(i, { dueDate: e.target.value })}
            />
          </Field>
        </div>
      ))}
      <button
        type="button"
        className="btn ghost small"
        onClick={() => onFollowUps([...followUps, { title: '', dueDate: '', hint: '' }])}
      >
        <Plus size={16} /> Altro passo (es. Holter)
      </button>
    </div>
  );
}
