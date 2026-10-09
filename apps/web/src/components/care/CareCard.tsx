import { Link } from 'react-router-dom';
import { careName } from '@ohana/shared';
import { useCareCard } from '../../lib/data';

const DAY_MONTH = new Intl.DateTimeFormat('it-IT', {
  timeZone: 'Europe/Rome',
  day: 'numeric',
  month: 'short',
});

/** La card «Cura» di Altro: i nomi delle persone e il prossimo controllo. */
export function CareCard() {
  const { people, nextCheck } = useCareCard();
  const sub = people.length ? people.map(careName).join(' · ') : 'Per chi segue un familiare';
  const state = nextCheck
    ? `controllo ${DAY_MONTH.format(nextCheck)}`
    : people.length
      ? undefined
      : 'Aggiungi una persona';
  return (
    <Link to="/cura" className="more-card" aria-label={`Cura, ${sub}${state ? ', ' + state : ''}`}>
      <span style={{ fontSize: 16, fontWeight: 600 }}>Cura</span>
      <span className="muted" style={{ fontSize: 13, lineHeight: 1.35 }}>
        {sub}
      </span>
      {state && (
        <span
          className="mono"
          style={{ marginTop: 'auto', fontSize: 11, color: 'var(--accent-ink)', textTransform: 'uppercase' }}
        >
          {state}
        </span>
      )}
    </Link>
  );
}
