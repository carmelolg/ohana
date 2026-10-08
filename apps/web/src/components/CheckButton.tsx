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

/** Casella di spunta con area tattile di 44 px (la parte visibile è 20 px). */
export function CheckButton({ checked, label, onToggle, disabled, emphasis, style }: Props) {
  const border = checked ? 0 : emphasis ? '2px solid var(--accent)' : '1.5px solid var(--text-2)';
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
        style={{
          width: 20,
          height: 20,
          borderRadius: 6,
          display: 'grid',
          placeItems: 'center',
          background: checked ? 'var(--accent-fill)' : 'transparent',
          color: 'var(--on-accent)',
          border,
        }}
      >
        {checked && <Check size={13} strokeWidth={3} />}
      </span>
    </button>
  );
}
