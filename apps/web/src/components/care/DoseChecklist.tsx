import { doseLabel, formatSlot, type DoseItem } from '@ohana/shared';
import type { Medication } from '../../lib/types';
import { ThreadTag } from './ThreadTag';

interface Props {
  items: DoseItem<Medication>[];
  /** Colore e nome breve del filone di ogni terapia. */
  tagOf: (med: Medication) => { hue: number; label: string } | null;
  /** `null` = sola lettura. */
  onToggle: ((item: DoseItem<Medication>) => void) | null;
}

/** Le dosi di oggi, con la casella per segnarle come date. */
export function DoseChecklist({ items, tagOf, onToggle }: Props) {
  if (items.length === 0) {
    return <p className="muted">Nessuna terapia con orario per oggi.</p>;
  }
  return (
    <div className="dose-card">
      {items.map((item) => {
        const tag = tagOf(item.med);
        const label = `${item.med.name} ${item.med.strength ?? ''} alle ${formatSlot(item.slot)}`.replace(
          /\s+/g,
          ' ',
        );
        return (
          <button
            key={`${item.med.id}-${item.slot}`}
            type="button"
            role="checkbox"
            aria-checked={item.taken}
            aria-label={label}
            className="dose-row"
            disabled={!onToggle}
            onClick={() => onToggle?.(item)}
          >
            <span className={'dose-box' + (item.taken ? ' on' : '')} aria-hidden>
              {item.taken ? '✓' : ''}
            </span>
            <span className="what">
              {item.med.name} {item.med.strength}
              <span className="at">
                {' '}
                · {formatSlot(item.slot)} · {doseLabel(item.med)}
              </span>
            </span>
            {tag && <ThreadTag hue={tag.hue}>{tag.label}</ThreadTag>}
          </button>
        );
      })}
    </div>
  );
}
