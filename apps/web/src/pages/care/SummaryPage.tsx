import { useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { buildVisitSummary, formatNumericDate, shortName } from '@ohana/shared';
import { BackLink } from '../../components/BackLink';
import { SummaryDocument } from '../../components/care/SummaryDocument';
import { logCareAccess } from '../../lib/api/care';
import { useCareEntries, useEvent, useSpace, useVisitPrep } from '../../lib/data';
import { useRecipientData } from './useRecipientData';

/** Riepilogo per il medico (4i): si stampa o si salva in PDF dal browser. */
export function CareSummaryPage() {
  const { rid } = useParams();
  const [params] = useSearchParams();
  const data = useRecipientData(rid);
  const { spaceById } = useSpace();
  const { data: entries = [] } = useCareEntries(rid);
  const eventId = params.get('evento') ?? undefined;
  const { data: visit } = useEvent(eventId);
  const { data: prep } = useVisitPrep(eventId);
  const activeThreads = data.threads.filter((t) => t.status === 'attivo');
  const threadId = params.get('filone') ?? visit?.care_thread_id ?? activeThreads[0]?.id;
  const thread = data.threads.find((t) => t.id === threadId);
  const now = new Date();

  const summary = useMemo(() => {
    if (!data.recipient || !thread) {
      return null;
    }
    const member = visit?.assignee_id
      ? spaceById(data.recipient.space_id)?.space_members.find((m) => m.user_id === visit.assignee_id)
      : undefined;
    return buildVisitSummary({
      recipient: data.recipient,
      thread,
      threads: data.threads,
      entries,
      medications: data.meds,
      visit: {
        starts_at: visit?.starts_at ?? now.toISOString(),
        caregiverName: member ? `${shortName(member.profiles)} ${member.profiles.last_name}`.trim() : null,
        caregiverPhone: null,
      },
      questions: (prep?.visit_questions ?? []).sort((a, b) => a.position - b.position).map((q) => q.text),
      now,
    });
    // `now` cambia a ogni render: il documento segue i dati
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.recipient, thread, data.threads, entries, data.meds, visit, prep]);

  if (!data.recipient) {
    return data.loading ? (
      <div className="empty">Caricamento…</div>
    ) : (
      <div className="empty">Persona non trovata</div>
    );
  }
  if (!summary || !thread) {
    return <div className="empty">Crea prima un filone di cura per preparare il riepilogo.</div>;
  }
  const print = () => {
    void logCareAccess(
      { spaceId: thread.space_id, recipientId: thread.recipient_id, threadId: thread.id },
      'export',
    );
    window.print();
  };

  return (
    <div>
      <div className="no-print-bar">
        <BackLink
          to={`/cura/${data.recipient.id}`}
          label={data.recipient.label ?? data.recipient.first_name}
        />
        <button className="btn accent small" onClick={print}>
          Stampa o salva in PDF
        </button>
      </div>
      {activeThreads.length > 1 && (
        <div className="chips" role="group" aria-label="Filone del riepilogo" style={{ margin: '12px 0' }}>
          {activeThreads.map((t) => (
            <Link
              key={t.id}
              className="chip"
              aria-pressed={t.id === thread.id}
              replace
              to={`/cura/${data.recipient!.id}/riepilogo?filone=${t.id}${eventId ? `&evento=${eventId}` : ''}`}
            >
              {t.title}
            </Link>
          ))}
        </div>
      )}
      <SummaryDocument summary={summary} dateLabel={formatNumericDate(now)} />
    </div>
  );
}
