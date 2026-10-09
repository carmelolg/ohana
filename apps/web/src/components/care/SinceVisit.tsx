import { entryLine, type EntryLike, type SinceItem } from '@ohana/shared';

const DAY_MONTH = new Intl.DateTimeFormat('it-IT', {
  timeZone: 'Europe/Rome',
  day: 'numeric',
  month: 'short',
});

/** «Da quando l'ha visto»: i tasselli del filone e, marcati, quelli degli altri filoni nello stesso periodo. */
export function SinceVisit<E extends EntryLike>({
  items,
  threadTitle,
}: {
  items: SinceItem<E>[];
  threadTitle: (id: string) => string;
}) {
  if (items.length === 0) {
    return <p className="muted">Nessuna novità dall’ultima visita.</p>;
  }
  return (
    <ul className="list">
      {items.map(({ entry, otherThread }) => (
        <li key={entry.id} className="since-row">
          {otherThread && <span className="other">Altro filone: {threadTitle(entry.thread_id)}</span>}
          <span>
            <span className="muted">{DAY_MONTH.format(new Date(entry.entry_date + 'T09:00:00'))} · </span>
            {entryLine(entry)}
          </span>
        </li>
      ))}
    </ul>
  );
}
