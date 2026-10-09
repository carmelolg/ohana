import { Share2 } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatReading, readingInfo, threadValues } from '@ohana/shared';
import { BackLink } from '../../components/BackLink';
import { ThreadTag } from '../../components/care/ThreadTag';
import { Timeline } from '../../components/care/Timeline';
import { logCareAccess } from '../../lib/api/care';
import { careColor } from '../../lib/color';
import { useCareEntries, useCareEvents, useMeasurements, useSpace } from '../../lib/data';
import type { CareEntry, CareThread, Medication } from '../../lib/types';
import { AddEntrySheet } from './AddEntrySheet';
import { useRecipientData } from './useRecipientData';

const FILTERS = [
  { key: 'tutto', label: 'Tutto', types: null },
  { key: 'visite', label: 'Visite', types: ['visita'] },
  { key: 'esami', label: 'Esami', types: ['esame'] },
  { key: 'terapie', label: 'Terapie', types: ['terapia'] },
  { key: 'episodi', label: 'Episodi', types: ['episodio'] },
] as const;
type FilterKey = (typeof FILTERS)[number]['key'];

const YEAR = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', year: 'numeric' });
const DAY_MONTH = new Intl.DateTimeFormat('it-IT', {
  timeZone: 'Europe/Rome',
  day: 'numeric',
  month: 'short',
});
const atNoon = (iso: string) => new Date(iso + 'T09:00:00');

function Summary({
  thread,
  own,
  therapy,
  action,
}: {
  thread: CareThread;
  own: CareEntry[];
  therapy: Medication | undefined;
  action: ReactNode;
}) {
  const { data: measures = [] } = useMeasurements(thread.recipient_id);
  const values = threadValues(
    own,
    measures.filter((m) => m.thread_id === thread.id),
    thread.tracked_params,
  );
  const since = thread.started_at ? `Dal ${YEAR.format(atNoon(thread.started_at))} · ` : '';
  const last = own[0] ? `ultimo ${DAY_MONTH.format(atNoon(own[0].entry_date))}` : 'nessun tassello';
  return (
    <>
      {(thread.specialty || thread.doctor) && (
        <div className="thread-eyebrow">
          {thread.specialty && (
            <ThreadTag hue={thread.color_hue} variant="main">
              {thread.specialty}
            </ThreadTag>
          )}
          {thread.doctor && <span className="doctor">{thread.doctor}</span>}
        </div>
      )}
      <div className="thread-title-row">
        <h1 className="care-name">{thread.title}</h1>
        {action}
      </div>
      <p className="muted thread-stats">
        {since}
        {own.length} tasselli · {last}
      </p>
      {(values.length > 0 || therapy) && (
        <div className="key-values">
          {values.map(({ key, value }) => (
            <div key={key}>
              <div className="k">{readingInfo(key).label}</div>
              <div className="v">{formatReading(key, value)}</div>
            </div>
          ))}
          {therapy && (
            <div>
              <div className="k">Terapia</div>
              <div className="v text">
                {therapy.name} {therapy.strength}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function ShareLink({ recipientId, threadId }: { recipientId: string; threadId: string }) {
  return (
    <Link
      className="icon-btn thread-share"
      aria-label="Condividi"
      to={`/cura/${recipientId}/riepilogo?filone=${threadId}`}
    >
      <Share2 size={20} strokeWidth={1.75} />
    </Link>
  );
}

function useThreadEntries(rid: string | undefined, tid: string | undefined, filter: FilterKey) {
  const { data: entries = [] } = useCareEntries(rid);
  const own = useMemo(() => entries.filter((e) => e.thread_id === tid), [entries, tid]);
  const shown = useMemo(() => {
    const types = FILTERS.find((f) => f.key === filter)?.types;
    return types ? own.filter((e) => (types as readonly string[]).includes(e.type)) : own;
  }, [own, filter]);
  return { own, shown };
}

/** Impegni aperti collegati al filone, dal più vicino; si vedono dove ha senso cercare una visita (Tutto, Visite). */
function useScheduled(tid: string | undefined, filter: FilterKey) {
  const { data: events = [] } = useCareEvents();
  return useMemo(
    () =>
      filter === 'tutto' || filter === 'visite'
        ? events
            .filter((e) => e.care_thread_id === tid && e.status === 'open')
            .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
        : [],
    [events, tid, filter],
  );
}

/** Filone (4b): ogni visita, esame, cambio di terapia ed episodio è un tassello in ordine di tempo. */
export function CareThreadPage() {
  const { rid, tid } = useParams();
  const data = useRecipientData(rid);
  const { memberName } = useSpace();
  const [filter, setFilter] = useState<FilterKey>('tutto');
  const [adding, setAdding] = useState(false);
  const { own, shown } = useThreadEntries(rid, tid, filter);
  const scheduled = useScheduled(tid, filter);
  const thread = data.threads.find((t) => t.id === tid);

  // il registro degli accessi sa chi ha consultato il filone
  useEffect(() => {
    if (thread) {
      void logCareAccess(
        { spaceId: thread.space_id, recipientId: thread.recipient_id, threadId: thread.id },
        'view',
      );
    }
  }, [thread?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!thread || !data.recipient) {
    return data.loading ? (
      <div className="empty">Caricamento…</div>
    ) : (
      <div className="empty">Filone non trovato</div>
    );
  }
  const recipient = data.recipient;

  return (
    <div style={{ ['--thread' as string]: careColor(thread.color_hue) }}>
      <BackLink to={`/cura/${recipient.id}`} label={`Cura · ${recipient.label ?? recipient.first_name}`} />
      <Summary
        thread={thread}
        own={own}
        therapy={data.meds.find((m) => m.active && m.thread_id === thread.id)}
        action={<ShareLink recipientId={recipient.id} threadId={thread.id} />}
      />
      <div className="chips" role="group" aria-label="Filtra i tasselli" style={{ marginTop: 8 }}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className="chip"
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>
      {shown.length === 0 && scheduled.length === 0 ? (
        <div className="empty">
          Ancora nessun tassello. Si aggiungono chiudendo una visita o con «+ Aggiungi».
        </div>
      ) : (
        <Timeline
          entries={shown}
          upcoming={scheduled}
          hue={thread.color_hue}
          authorName={(id) => memberName(id).split(' ')[0]}
          year={new Date().getFullYear()}
        />
      )}
      {data.canWrite && (
        <div className="hstack" style={{ marginTop: 8 }}>
          <button className="btn ghost small" onClick={() => setAdding(true)}>
            + Aggiungi
          </button>
          <Link className="btn ghost small" to={`/nuovo?filone=${thread.id}`}>
            + Impegno
          </Link>
          <Link className="btn ghost small" to={`/cura/${recipient.id}/filone/${thread.id}/modifica`}>
            Modifica filone
          </Link>
        </div>
      )}
      {adding && <AddEntrySheet thread={thread} onClose={() => setAdding(false)} />}
      <p className="care-disclaimer">
        Ohana raccoglie e mette in ordine ciò che dicono i medici: non dà indicazioni mediche.
      </p>
    </div>
  );
}
