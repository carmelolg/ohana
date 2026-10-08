interface Props {
  value: number;
  max: number;
  label?: string;
  /** Larghezza minima della barra riempita, in percentuale (così a 0 resta visibile). */
  minPercent?: number;
  animated?: boolean;
}

/** Barra di avanzamento accessibile. */
export function ProgressBar({ value, max, label = 'Avanzamento', minPercent = 0, animated }: Props) {
  const percent = max > 0 ? (value / max) * 100 : 0;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={label}
      style={{ height: 6, borderRadius: 3, background: 'var(--surface-2)', overflow: 'hidden' }}
    >
      <div
        style={{
          width: `${Math.max(minPercent, percent)}%`,
          height: '100%',
          background: 'var(--accent)',
          transition: animated ? 'width .2s' : undefined,
        }}
      />
    </div>
  );
}
