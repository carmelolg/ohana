import type { UnderstoodChip } from './understood';

interface Props {
  title: string;
  kindLabel: string;
  chips: UnderstoodChip[];
}

/** Card «Ho capito»: tipo e titolo scelti dal testo libero, con i campi riconosciuti come chip. */
export function UnderstoodCard({ title, kindLabel, chips }: Props) {
  return (
    <div className="understood" aria-live="polite">
      <div className="understood-head">
        <span className="label">Ho capito</span>
        <span className="understood-kind">{kindLabel}</span>
      </div>
      <div className="understood-title">{title}</div>
      {chips.length > 0 && (
        <div className="understood-chips">
          {chips.map((c) => (
            <span key={c.k} className="understood-chip">
              <span className="muted">{c.k}</span>
              <b>{c.v}</b>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
