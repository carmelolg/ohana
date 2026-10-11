interface Props {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

/** Interruttore 48×28 per attivare/disattivare; l'area tattile è estesa a 44 px da CSS. */
export function Switch({ checked, label, onChange, disabled }: Props) {
  return (
    <button
      type="button"
      role="switch"
      className="switch"
      aria-label={label}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    />
  );
}
