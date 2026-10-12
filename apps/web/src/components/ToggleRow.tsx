import { Switch } from './Switch';

interface Props {
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

/** Riga con interruttore: etichetta (e, sotto, cosa cambia) a sinistra, interruttore a destra. */
export function ToggleRow({ label, hint, checked, disabled, onChange }: Props) {
  return (
    <div className="set-row">
      <div className="set-row-text">
        <span>{label}</span>
        {hint && <span className="muted set-hint">{hint}</span>}
      </div>
      <Switch label={label} checked={checked} disabled={disabled} onChange={onChange} />
    </div>
  );
}
