interface Props {
  mineOnly: boolean;
  onChange: (mineOnly: boolean) => void;
}

/** «solo le tue / tutte» */
export function ChoresFilter({ mineOnly, onChange }: Props) {
  return (
    <label className="muted" style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span className="sr-only">Filtra le faccende</span>
      <select
        className="inline-select plain"
        aria-label="Filtra le faccende"
        value={mineOnly ? 'mie' : 'tutte'}
        onChange={(e) => onChange(e.target.value === 'mie')}
        style={{ textAlign: 'right', cursor: 'pointer' }}
      >
        <option value="mie">solo le tue ▾</option>
        <option value="tutte">tutte ▾</option>
      </select>
    </label>
  );
}
