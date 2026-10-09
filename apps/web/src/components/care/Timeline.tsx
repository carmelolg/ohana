import { Link } from 'react-router-dom';
import { ENTRY_TYPE_LABEL } from '@ohana/shared';
import { careColor } from '../../lib/color';
import { openCareFile } from '../../lib/api/careFiles';
import type { CareReminderEvent } from '../../lib/data';
import type { CareEntry } from '../../lib/types';

const DAY_MONTH = new Intl.DateTimeFormat('it-IT', {
  timeZone: 'Europe/Rome',
  day: 'numeric',
  month: 'short',
});
const TIME = new Intl.DateTimeFormat('it-IT', {
  timeZone: 'Europe/Rome',
  hour: '2-digit',
  minute: '2-digit',
});
const withYear = new Intl.DateTimeFormat('it-IT', {
  timeZone: 'Europe/Rome',
  day: 'numeric',
  month: 'short',
  year: '2-digit',
});

/** Una riga della linea del tempo: un tassello già registrato o un impegno ancora in programma. */
type Item =
  { kind: 'entry'; at: number; entry: CareEntry } | { kind: 'planned'; at: number; event: CareReminderEvent };

interface Props {
  entries: CareEntry[];
  /** Impegni aperti del filone (visite, controlli): stanno nella stessa linea, in cima, finché non si registra l'esito. */
  upcoming?: CareReminderEvent[];
  hue: number;
  authorName: (id: string) => string;
  /** Anno corrente: gli anni diversi compaiono nella data. */
  year: number;
  /** Mostra solo le prime righe (colonna del desktop). */
  limit?: number;
}

type RowProps = Pick<Props, 'hue' | 'authorName' | 'year'> & { last: boolean };

function PlannedRow({ event, hue, year, last }: Omit<RowProps, 'authorName'> & { event: CareReminderEvent }) {
  const date = new Date(event.starts_at);
  const sameYear = date.getFullYear() === year;
  return (
    <div className="tl-row planned" style={{ ['--thread' as string]: careColor(hue) }}>
      <div className="tl-date">{(sameYear ? DAY_MONTH : withYear).format(date)}</div>
      <div className="tl-rail">
        <div className="tl-node planned" />
        {!last && <div className="tl-line" />}
      </div>
      <div className="tl-body">
        <span className="tl-type">In programma · {TIME.format(date)}</span>
        <Link className="tl-title" to={`/evento/${event.id}`}>
          {event.title}
        </Link>
      </div>
    </div>
  );
}

function EntryRow({ entry, hue, authorName, year, last }: RowProps & { entry: CareEntry }) {
  const date = new Date(entry.entry_date + 'T09:00:00');
  const author = entry.type === 'visita' || entry.type === 'episodio' ? authorName(entry.author_id) : '';
  return (
    <div className="tl-row" style={{ ['--thread' as string]: careColor(hue) }}>
      <div className="tl-date">{(date.getFullYear() === year ? DAY_MONTH : withYear).format(date)}</div>
      <div className="tl-rail">
        <div className={'tl-node' + (entry.type === 'visita' ? ' filled' : '')} />
        {!last && <div className="tl-line" />}
      </div>
      <div className="tl-body">
        <span className="tl-type">
          {ENTRY_TYPE_LABEL[entry.type]}
          {author && ` · ${author}`}
        </span>
        <span className="tl-title">{entry.title}</span>
        {entry.text && <span className="tl-text">{entry.text}</span>}
        {entry.care_files.length > 0 && (
          <div className="tl-chips">
            {entry.care_files.map((f) => (
              <button
                key={f.id}
                type="button"
                className="file-chip"
                onClick={() => void openCareFile(f.path)}
              >
                📎 {f.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Dal più lontano al più vicino nel futuro, poi i tasselli dal più recente: una sola linea, in ordine di tempo. */
function timelineItems(entries: CareEntry[], upcoming: CareReminderEvent[]): Item[] {
  // un impegno che ha già il suo tassello (visita chiusa) non si ripete
  const recorded = new Set(entries.map((e) => e.event_id).filter(Boolean));
  const planned: Item[] = upcoming
    .filter((e) => !recorded.has(e.id))
    .map((event) => ({ kind: 'planned', at: Date.parse(event.starts_at), event }));
  const done: Item[] = entries.map((entry) => ({
    kind: 'entry',
    at: Date.parse(entry.entry_date + 'T09:00:00'),
    entry,
  }));
  return [...planned, ...done].sort((a, b) => b.at - a.at);
}

/** Linea del tempo verticale di un filone (4b): tasselli e impegni in programma insieme. */
export function Timeline({ entries, upcoming = [], limit, ...rest }: Props) {
  const items = timelineItems(entries, upcoming);
  const shown = limit ? items.slice(0, limit) : items;
  return (
    <div className="timeline">
      {shown.map((item, i) => {
        const last = i === shown.length - 1;
        return item.kind === 'planned' ? (
          <PlannedRow key={item.event.id} event={item.event} last={last} {...rest} />
        ) : (
          <EntryRow key={item.entry.id} entry={item.entry} last={last} {...rest} />
        );
      })}
    </div>
  );
}
