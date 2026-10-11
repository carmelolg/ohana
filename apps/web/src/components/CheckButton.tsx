import { Check } from 'lucide-react';

interface Props {
  checked: boolean;
  /** Testo letto dagli screen reader (e usato dai test). */
  label: string;
  onToggle: () => void;
  disabled?: boolean;
  /** Evidenzia il bordo (es. il passaggio corrente di una pratica) quando non è ancora spuntato. */
  emphasis?: boolean;
  style?: React.CSSProperties;
}

/** Casella di spunta con area tattile di 44 px (la parte visibile è 24 px, quadrata arrotondata, verde quando piena). */
export function CheckButton({ checked, label, onToggle, disabled, emphasis, style }: Props) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      style={{ width: 44, height: 44, display: 'grid', placeItems: 'center', flex: 'none', ...style }}
    >
      <span
        className={'check-box' + (checked ? ' on' : '')}
        style={!checked && emphasis ? { borderColor: 'var(--accent)', borderWidth: 2 } : undefined}
      >
        {checked && <Check size={14} strokeWidth={3} />}
      </span>
    </button>
  );
}
