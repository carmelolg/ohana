import { Link } from 'react-router-dom';
import { threadOverview, type ThreadOverview } from '@ohana/shared';
import { careColor } from '../../lib/color';
import type { CareThread } from '../../lib/types';

const DAY_MONTH = new Intl.DateTimeFormat('it-IT', {
  timeZone: 'Europe/Rome',
  day: 'numeric',
  month: 'short',
});
const TYPE_WORD = {
  visita: 'visita',
  esame: 'esami',
  terapia: 'terapia',
  episodio: 'episodio',
  nota: 'nota',
} as const;

const dayLabel = (iso: string) => DAY_MONTH.format(new Date(iso + 'T09:00:00'));

export function lastLabel(o: ThreadOverview): string {
  return o.last ? `${dayLabel(o.last.date)} · ${TYPE_WORD[o.last.type]}` : '—';
}

export function nextLabel(o: ThreadOverview): string {
  if (!o.next) {
    return '—';
  }
  if (o.next.kind === 'impegno') {
    return `${dayLabel(o.next.date)} · ${o.next.title.toLowerCase()}`;
  }
  const hint = o.next.hint && /^\d{4}-/.test(o.next.hint) ? `entro ${dayLabel(o.next.hint)}` : o.next.hint;
  return hint ? `${o.next.title} · ${hint}` : o.next.title;
}

interface CardProps {
  recipientId: string;
  thread: CareThread;
  overview: ThreadOverview | undefined;
}

/** La card di un filone: il tema, l'ultimo tassello e il prossimo passo. Stessa su telefono e desktop. */
export function ThreadCard({ recipientId, thread: t, overview }: CardProps) {
  const o = overview ?? threadOverview([], [], t.id, new Date());
  return (
    <Link
      className="thread-card"
      to={`/cura/${recipientId}/filone/${t.id}`}
      style={{ ['--thread' as string]: careColor(t.color_hue) }}
    >
      <div className="meta">
        <b>{[t.specialty, t.doctor].filter(Boolean).join(' · ') || 'Filone di cura'}</b>
        <span className="label">{o.count} tasselli</span>
      </div>
      <h3>{t.title}</h3>
      <div className="care-pair">
        <div>
          <span>Ultimo</span>
          <b>{lastLabel(o)}</b>
        </div>
        <div>
          <span>Prossimo</span>
          <b>{nextLabel(o)}</b>
        </div>
      </div>
    </Link>
  );
}

interface Props {
  recipientId: string;
  threads: CareThread[];
  overviews: Map<string, ThreadOverview>;
}

/** Le card dei filoni (4a). */
export function ThreadCards({ recipientId, threads, overviews }: Props) {
  return (
    <div className="care-thread-list">
      {threads.map((t) => (
        <ThreadCard key={t.id} recipientId={recipientId} thread={t} overview={overviews.get(t.id)} />
      ))}
    </div>
  );
}
