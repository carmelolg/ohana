import { SPACE_HUES } from '@ohana/shared';
import { spaceColor } from '../lib/color';

interface Props {
  value: number;
  onChange: (hue: number) => void;
  /** Prefisso dell'etichetta letta dagli screen reader («Colore 42»). */
  labelPrefix?: string;
}

/** Scelta del colore di uno spazio tra le tonalità disponibili. */
export function HueSwatches({ value, onChange, labelPrefix = 'Colore' }: Props) {
  return (
    <div className="swatches">
      {SPACE_HUES.map((h) => (
        <button
          type="button"
          key={h}
          className="swatch"
          style={{ ['--c' as string]: spaceColor(h) }}
          aria-pressed={value === h}
          aria-label={`${labelPrefix} ${h}`}
          onClick={() => onChange(h)}
        />
      ))}
    </div>
  );
}
