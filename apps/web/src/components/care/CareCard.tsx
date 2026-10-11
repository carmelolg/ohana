import { Link } from 'react-router-dom';
import { careName } from '@ohana/shared';
import { useCareCard } from '../../lib/data';

const DAY_MONTH = new Intl.DateTimeFormat('it-IT', {
  timeZone: 'Europe/Rome',
  day: 'numeric',
  month: 'short',
});

/** La card «Cura» di Famiglia: i nomi delle persone e il prossimo controllo. */
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
      <span className="more-card-title">Cura</span>
      <span className="muted more-card-sub">{sub}</span>
      {state && <span className="more-card-state">{state}</span>}
    </Link>
  );
}
