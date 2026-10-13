import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  careTodos,
  dosesOfDay,
  threadOverview,
  type CareTodo,
  type DoseItem,
  type ThreadOverview,
} from '@ohana/shared';
import { BackLink } from '../../components/BackLink';
import { DoseChecklist } from '../../components/care/DoseChecklist';
import { PersonChips } from '../../components/care/PersonChips';
import { TodoList } from '../../components/care/TodoList';
import { useAuth } from '../../lib/auth';
import { useCareEntries, useCareEvents, useSpace, type CareReminderEvent } from '../../lib/data';
import type { CareEntry, CareRecipient, Medication } from '../../lib/types';
import { useMediaQuery } from '../../lib/useMediaQuery';
import { DesktopColumns } from './DesktopColumns';
import { HubHeader } from './HubHeader';
import { ThreadCards } from './ThreadCards';
import { useDoseToggle } from './useDoseToggle';
import { useRecipientData, type RecipientData } from './useRecipientData';

/** Le sezioni di una persona, raggiungibili sia da telefono sia da desktop. */
const SECTIONS = [
  ['terapie', 'Terapie'],
  ['parametri', 'Parametri'],
  ['documenti', 'Documenti'],
] as const;

interface HubView {
  overviews: Map<string, ThreadOverview>;
  todayItems: DoseItem<Medication>[];
  todos: CareTodo[];
  nextVisit: CareReminderEvent | undefined;
}

/** Tutto ciò che la scheda mostra, calcolato dai dati: panoramica dei filoni, dosi di oggi, «Da fare», prossima visita. */
function useHubView(data: RecipientData, entries: CareEntry[], events: CareReminderEvent[]): HubView {
  const { recipient } = data;
  return useMemo(() => {
    const now = new Date();
    const mine = events.filter((e) => data.threads.some((t) => t.id === e.care_thread_id));
    const taken = data.doses.filter((d) => data.meds.some((m) => m.id === d.medication_id));
    return {
      overviews: new Map(data.threads.map((t) => [t.id, threadOverview(entries, mine, t.id, now)])),
      todayItems: dosesOfDay(data.meds, taken, now),
      todos: recipient
        ? careTodos({
            medications: data.meds,
            doses: data.doses,
            exemptions: recipient.exemptions,
            followUps: entries.flatMap((e) => e.follow_ups),
            refillRequested: new Set(
              events.filter((e) => e.status === 'open' && e.medication_id).map((e) => e.medication_id!),
            ),
            now,
          })
        : [],
      nextVisit: mine
        .filter((e) => e.status === 'open' && new Date(e.starts_at) >= now)
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0],
    };
  }, [data.threads, data.meds, data.doses, entries, events, recipient]);
}

const tagOf = (data: RecipientData) => (med: Medication) => {
  const thread = data.threads.find((x) => x.id === med.thread_id);
  return thread ? { hue: thread.color_hue, label: thread.title.split(' ').slice(-1)[0] } : null;
};

function MobileBody({
  recipient,
  data,
  view,
}: {
  recipient: CareRecipient;
  data: RecipientData;
  view: HubView;
}) {
  const toggleDose = useDoseToggle();
  const active = data.threads.filter((t) => t.status === 'attivo');
  return (
    <>
      <nav className="care-shortcuts" aria-label="Sezioni di cura">
        {SECTIONS.map(([path, label]) => (
          <Link key={path} to={`/cura/${recipient.id}/${path}`}>
            {label}
          </Link>
        ))}
      </nav>
      {view.todos.length > 0 && (
        <>
          <div className="care-section-head">
            <span className="label">Da fare</span>
          </div>
          <TodoList todos={view.todos} to={`/cura/${recipient.id}/terapie`} />
        </>
      )}
      <div className="care-section-head">
        <span className="label">Oggi</span>
      </div>
      <DoseChecklist
        items={view.todayItems}
        tagOf={tagOf(data)}
        onToggle={data.canWrite ? toggleDose : null}
      />
      <div className="care-section-head">
        <span className="label">Filoni di cura</span>
        <span className="muted" style={{ fontSize: 12 }}>
          {active.length} attivi
        </span>
      </div>
      <ThreadCards recipientId={recipient.id} threads={active} overviews={view.overviews} />
      {data.canWrite && (
        <Link className="btn ghost small" style={{ marginTop: 10 }} to={`/cura/${recipient.id}/filone/nuovo`}>
          + Nuovo filone
        </Link>
      )}
    </>
  );
}

function DesktopBody({
  recipient,
  data,
  view,
  entries,
  events,
}: {
  recipient: CareRecipient;
  data: RecipientData;
  view: HubView;
  entries: CareEntry[];
  events: CareReminderEvent[];
}) {
  const { memberName } = useSpace();
  const toggleDose = useDoseToggle();
  return (
    <>
      <div className="hstack" style={{ margin: '14px 0' }}>
        {view.nextVisit && (
          <Link className="btn ghost small" to={`/evento/${view.nextVisit.id}/prepara`}>
            Prepara visita
          </Link>
        )}
        {SECTIONS.map(([path, label]) => (
          <Link key={path} className="btn ghost small" to={`/cura/${recipient.id}/${path}`}>
            {label}
          </Link>
        ))}
        <Link className="btn ghost small" to={`/cura/${recipient.id}/riepilogo`}>
          Esporta PDF
        </Link>
        <Link className="btn ghost small" to={`/cura/${recipient.id}/filone/nuovo`}>
          + Filone
        </Link>
      </div>
      <DesktopColumns
        recipientId={recipient.id}
        threads={data.threads.filter((t) => t.status === 'attivo')}
        overviews={view.overviews}
        entries={entries}
        events={events}
        meds={data.meds}
        todayItems={view.todayItems}
        todos={view.todos}
        authorName={(id) => memberName(id).split(' ')[0]}
        year={new Date().getFullYear()}
        onToggleDose={data.canWrite ? toggleDose : null}
      />
    </>
  );
}

/** Cura · scheda della persona assistita (4a su telefono, 4h su desktop). */
export function CareHubPage() {
  const { rid } = useParams();
  const data = useRecipientData(rid);
  const { recipient } = data;
  const { session } = useAuth();
  const desktop = useMediaQuery('(min-width: 1024px)');
  const { data: entries = [] } = useCareEntries(recipient?.id);
  const { data: events = [] } = useCareEvents();
  const view = useHubView(data, entries, events);

  if (data.loading) {
    return (
      <div className="empty" role="status" aria-busy="true">
        Caricamento…
      </div>
    );
  }
  if (!recipient) {
    return (
      <div>
        <BackLink to="/famiglia" label="Famiglia" />
        <div className="empty">
          Nessuna persona assistita in questa vista.
          <br />
          <Link to="/cura/nuova">Aggiungi una persona</Link>
        </div>
      </div>
    );
  }
  return (
    <div>
      <BackLink to="/famiglia" label="Famiglia" />
      <HubHeader recipient={recipient} me={session?.user.id ?? ''} canWrite={data.canWrite} />
      <PersonChips people={data.scope} currentId={recipient.id} canAdd={data.canWrite} />
      {desktop ? (
        <DesktopBody recipient={recipient} data={data} view={view} entries={entries} events={events} />
      ) : (
        <MobileBody recipient={recipient} data={data} view={view} />
      )}
      <p className="care-disclaimer">
        Ohana raccoglie e mette in ordine ciò che dicono i medici: non dà indicazioni mediche.
      </p>
    </div>
  );
}
