import { formatEuro, toCents } from '@ohana/shared';
import { useEventExpenses } from '../../lib/data';

/** Spese collegate a questo impegno (create con «+ Spesa»): compaiono qui, senza dover uscire dall'editor. */
export function LinkedExpenses({ eventId }: { eventId: string }) {
  const linked = useEventExpenses(eventId);
  if (linked.length === 0) {
    return null;
  }
  // somma in centesimi interi, come ogni calcolo di denaro
  const totalCents = linked.reduce((sum, e) => sum + toCents(Number(e.amount)), 0);
  return (
    <section className="field" style={{ marginTop: 18 }} aria-label="Spese collegate">
      <span className="label">Spese collegate</span>
      <ul className="linked-expenses">
        {linked.map((e) => (
          <li key={e.id}>
            <span>{e.description}</span>
            <span>{formatEuro(Number(e.amount))}</span>
          </li>
        ))}
      </ul>
      <span className="muted" style={{ fontSize: 13 }}>
        Totale {formatEuro(totalCents / 100)}
      </span>
    </section>
  );
}
