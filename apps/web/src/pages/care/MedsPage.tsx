import { Link, useParams } from 'react-router-dom';
import {
  careTodos,
  doseLabel,
  estimateStock,
  scheduleLabel,
  stockDaysLeft,
  stockFraction,
  type CareTodo,
} from '@ohana/shared';
import { BackLink } from '../../components/BackLink';
import { StockBar } from '../../components/care/StockBar';
import { ThreadTag } from '../../components/care/ThreadTag';
import { useCareEntries, useCareEvents } from '../../lib/data';
import type { CareRecipient, CareThread, Medication, MedicationDose } from '../../lib/types';
import { RefillAlert } from './RefillAlert';
import { useRecipientData } from './useRecipientData';

const DAY_MONTH = new Intl.DateTimeFormat('it-IT', {
  timeZone: 'Europe/Rome',
  day: 'numeric',
  month: 'short',
});
const formatDate = (iso: string) => DAY_MONTH.format(new Date(iso + 'T09:00:00'));

interface MedCardProps {
  med: Medication;
  recipientId: string;
  thread: CareThread | undefined;
  doses: MedicationDose[];
  now: Date;
}

function MedCard({ med, recipientId, thread, doses, now }: MedCardProps) {
  const taken = doses.filter((d) => d.medication_id === med.id);
  return (
    <Link className="med-card" to={`/cura/${recipientId}/terapie/${med.id}`}>
      <div className="top">
        <span className="name">
          {med.name} {med.strength}
        </span>
        {thread ? (
          <ThreadTag hue={thread.color_hue}>{thread.title.split(' ').slice(-1)[0]}</ThreadTag>
        ) : (
          <span className="label">Generale</span>
        )}
      </div>
      <span className="posology">
        {doseLabel(med)} · {med.notes ? med.notes : scheduleLabel(med.schedule)}
      </span>
      <StockBar
        fraction={stockFraction(estimateStock(med, taken, now), med)}
        daysLeft={stockDaysLeft(med, taken, now)}
      />
    </Link>
  );
}

/** Piani terapeutici ed esenzioni con la loro scadenza. */
function PlansAndExemptions({ plans, recipient }: { plans: Medication[]; recipient: CareRecipient }) {
  if (plans.length === 0 && recipient.exemptions.length === 0) {
    return null;
  }
  return (
    <>
      <div className="care-section-head">
        <span className="label">Piani terapeutici ed esenzioni</span>
      </div>
      <div className="group">
        {plans.map((m) => (
          <div key={m.id} className="kv">
            <span>Piano terapeutico {m.name.toLowerCase()}</span>
            <b>scade {formatDate(m.plan_expires_at!)}</b>
          </div>
        ))}
        {recipient.exemptions.map((e) => (
          <div key={e.code ?? e.label} className="kv">
            <span>
              Esenzione {e.code} · {e.label}
            </span>
            <b>{e.expires_at ? `scade ${formatDate(e.expires_at)}` : 'permanente'}</b>
          </div>
        ))}
      </div>
    </>
  );
}

/** Terapie (4d): tutte le cure della persona, su tutti i filoni, con scorte, ricette e piani terapeutici. */
export function CareMedsPage() {
  const { rid } = useParams();
  const data = useRecipientData(rid);
  const { data: events = [] } = useCareEvents();
  const { data: entries = [] } = useCareEntries(rid);
  const { recipient } = data;
  if (!recipient) {
    return data.loading ? (
      <div className="empty">Caricamento…</div>
    ) : (
      <div className="empty">Persona non trovata</div>
    );
  }
  const now = new Date();
  const active = data.meds.filter((m) => m.active);
  const todos = careTodos({
    medications: data.meds,
    doses: data.doses,
    exemptions: recipient.exemptions,
    followUps: entries.flatMap((e) => e.follow_ups),
    refillRequested: new Set(
      events.filter((e) => e.status === 'open' && e.medication_id).map((e) => e.medication_id!),
    ),
    now,
  });
  const refills = todos.filter(
    (t): t is CareTodo & { medicationId: string } => t.kind === 'ricetta' && !!t.medicationId,
  );
  const filoni = new Set(active.map((m) => m.thread_id).filter(Boolean)).size;

  return (
    <div>
      <div className="hstack" style={{ justifyContent: 'space-between' }}>
        <BackLink to={`/cura/${recipient.id}`} label={recipient.label ?? recipient.first_name} />
        {data.canWrite && (
          <Link className="btn ghost small" to={`/cura/${recipient.id}/terapie/nuova`}>
            + Farmaco
          </Link>
        )}
      </div>
      <h1 className="care-name">Terapie</h1>
      <p className="muted" style={{ fontSize: 14 }}>
        {active.length} attive in {filoni || 1} {filoni > 1 ? 'filoni' : 'filone'}
      </p>
      {refills.map((todo) => {
        const med = active.find((m) => m.id === todo.medicationId);
        return (
          med && (
            <RefillAlert
              key={todo.key}
              todo={todo}
              med={med}
              recipient={recipient}
              canWrite={data.canWrite}
            />
          )
        );
      })}
      <div style={{ marginTop: 14 }}>
        {active.map((med) => (
          <MedCard
            key={med.id}
            med={med}
            recipientId={recipient.id}
            thread={data.threads.find((t) => t.id === med.thread_id)}
            doses={data.doses}
            now={now}
          />
        ))}
        {active.length === 0 && <div className="empty">Nessuna terapia. Aggiungi il primo farmaco.</div>}
      </div>
      <PlansAndExemptions plans={active.filter((m) => m.plan_expires_at)} recipient={recipient} />
      <p className="care-disclaimer">
        Ohana non controlla le interazioni tra farmaci: la domanda va posta al medico (vedi «Prepara la
        visita»).
      </p>
    </div>
  );
}
