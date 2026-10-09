import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { careName, formatDay, formatTime, sinceLastVisit } from '@ohana/shared';
import { BackLink } from '../../components/BackLink';
import { BringList } from '../../components/care/BringList';
import { QuestionList } from '../../components/care/QuestionList';
import { SinceVisit } from '../../components/care/SinceVisit';
import {
  useCareEntries,
  useCareRecipients,
  useCareThreads,
  useEvent,
  useSpace,
  useVisitPrep,
} from '../../lib/data';
import type { CareThread, EventRow } from '../../lib/types';
import { usePrepActions } from './usePrepActions';

const DAY_MONTH = new Intl.DateTimeFormat('it-IT', {
  timeZone: 'Europe/Rome',
  day: 'numeric',
  month: 'short',
});

function PrepHeader({
  visit,
  thread,
  assignee,
  person,
}: {
  visit: EventRow;
  thread: CareThread;
  assignee: string | null;
  /** La persona assistita a cui appartiene la visita. */
  person: string | null;
}) {
  const when = new Date(visit.starts_at);
  return (
    <>
      <div className="hstack" style={{ justifyContent: 'space-between' }}>
        <BackLink to={`/evento/${visit.id}`} label="Visita" history />
        <Link
          className="btn ghost small"
          to={`/cura/${thread.recipient_id}/riepilogo?filone=${thread.id}&evento=${visit.id}`}
        >
          PDF
        </Link>
      </div>
      <div>
        <span className="label">
          {[person, thread.specialty ?? thread.title].filter(Boolean).join(' · ')}
        </span>
        <h1 className="care-name" style={{ fontSize: 28 }}>
          {visit.title}
        </h1>
        <p className="muted" style={{ textTransform: 'capitalize' }}>
          {[formatDay(when), formatTime(when), assignee].filter(Boolean).join(' · ')}
        </p>
      </div>
    </>
  );
}

/** Prepara la visita (4f): domande della famiglia, cosa è successo dall'ultima volta (anche negli altri filoni), cosa portare. */
export function VisitPrepPage() {
  const { id } = useParams();
  const { data: visit, isLoading } = useEvent(id);
  const { data: threads = [] } = useCareThreads();
  const thread = threads.find((t) => t.id === visit?.care_thread_id);
  const { data: people = [] } = useCareRecipients();
  const owner = people.find((p) => p.id === thread?.recipient_id);
  const person = owner ? careName(owner) : null;
  const { data: entries = [] } = useCareEntries(thread?.recipient_id);
  const { data: prep } = useVisitPrep(id);
  const { memberName, canWrite, myRole } = useSpace();
  const actions = usePrepActions(
    { spaceId: visit?.space_id ?? '', eventId: id ?? '', threadId: thread?.id ?? null },
    prep,
  );
  const since = useMemo(() => (thread ? sinceLastVisit(entries, thread.id) : null), [entries, thread]);

  if (isLoading) {
    return <div className="empty">Caricamento…</div>;
  }
  if (!visit) {
    return <div className="empty">Impegno non trovato</div>;
  }
  if (!thread) {
    return (
      <div className="empty">
        Questa visita non è collegata a un filone di cura.{' '}
        <Link to={`/evento/${visit.id}`}>Apri l’impegno</Link> e scegli il filone.
      </div>
    );
  }
  const assignee = visit.assignee_id
    ? visit.assignee_id === actions.me
      ? 'accompagna tu'
      : `accompagna ${memberName(visit.assignee_id).split(' ')[0]}`
    : null;
  const writable = canWrite(visit.space_id);
  const isAdmin = ['owner', 'admin'].includes(myRole(visit.space_id) ?? '');
  const questions = [...(prep?.visit_questions ?? [])].sort((a, b) => a.position - b.position);

  return (
    <div className="care-form care-page">
      <PrepHeader visit={visit} thread={thread} assignee={assignee} person={person} />
      <div className="care-section-head">
        <span className="label">Domande da fare</span>
        <span className="muted">{questions.length}</span>
      </div>
      <QuestionList
        questions={questions}
        authorName={(uid) => memberName(uid).split(' ')[0]}
        me={actions.me}
        isAdmin={isAdmin}
        canWrite={writable}
        onAdd={actions.add}
        onToggle={(q) => void actions.toggle(q)}
        onRemove={(q) => void actions.remove(q)}
      />
      <div className="care-section-head">
        <span className="label">Da quando l’ha visto</span>
        <span className="muted">
          {since?.since ? `${DAY_MONTH.format(new Date(since.since + 'T09:00:00'))} → oggi` : 'dall’inizio'}
        </span>
      </div>
      <SinceVisit
        items={since?.items ?? []}
        threadTitle={(tid) => threads.find((t) => t.id === tid)?.title ?? 'Altro'}
      />
      <div className="care-section-head">
        <span className="label">Da portare</span>
      </div>
      <BringList
        items={prep?.bring ?? []}
        canWrite={writable}
        onChange={(next) => void actions.setBring(next)}
      />
      <p className="care-disclaimer">
        Ohana non controlla le interazioni tra farmaci: se hai un dubbio, scrivilo qui tra le domande e
        chiedilo al medico.
      </p>
    </div>
  );
}
