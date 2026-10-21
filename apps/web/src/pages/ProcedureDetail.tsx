import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BackLink } from '../components/BackLink';
import { spaceColor } from '../lib/color';
import {
  useLinkedEvents,
  useMutate,
  type Mutate,
  useProcedureEvents,
  useProcedures,
  useSpace,
} from '../lib/data';
import { useDialog } from '../lib/dialog';
import { useToast } from '../lib/toast';
import type { Procedure, ProcedureStep } from '../lib/types';
import { ProcedureTabs, type ProcedureTab } from './procedure/ProcedureTabs';
import { PhaseSummary } from './procedure/PhaseSummary';
import { AddStepForm } from './procedure/AddStepForm';
import { DocsSection } from './procedure/DocsSection';
import { ProcedureHeader } from './procedure/ProcedureHeader';
import { ProcedureTimeline } from './procedure/ProcedureTimeline';
import { EditProcedureSheet } from './procedure/EditProcedureSheet';
import {
  addRequiredDocument,
  addStep,
  moveStep,
  sortedSteps,
  toggleStep,
} from './procedure/procedureCommands';
import { StepList } from './procedure/StepList';
import { StepSheet } from './procedure/StepSheet';

/** Dettaglio di una pratica (3e): avanzamento, passaggi e documenti richiesti. */
export default function ProcedureDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { data: list = [], isLoading } = useProcedures();
  const procedure = list.find((x) => x.id === id);
  if (isLoading) {
    return (
      <div className="empty" role="status" aria-busy="true">
        Caricamento…
      </div>
    );
  }
  if (!procedure) {
    return (
      <div className="empty">
        Pratica non trovata.{' '}
        <button className="btn ghost small" onClick={() => nav('/pratiche')}>
          Torna alle pratiche
        </button>
      </div>
    );
  }
  return <ProcedureView procedure={procedure} onDeleted={() => nav('/pratiche')} />;
}

function TopBar({ writable, onEdit }: { writable: boolean; onEdit: () => void }) {
  return (
    <div className="hstack" style={{ justifyContent: 'space-between' }}>
      <BackLink to="/pratiche" label="Pratiche" />
      {writable && (
        <button className="btn ghost small" style={{ marginTop: 6 }} onClick={onEdit}>
          Modifica
        </button>
      )}
    </div>
  );
}

/** Chiede il nome di un documento richiesto e lo aggiunge alla pratica. */
async function askRequiredDocument(dialog: ReturnType<typeof useDialog>, mutate: Mutate, p: Procedure) {
  const name = (
    await dialog.prompt({
      title: 'Documento richiesto',
      label: 'Nome',
      placeholder: 'Es. Certificato di residenza',
      confirmLabel: 'Aggiungi',
    })
  )?.trim();
  if (name) {
    await addRequiredDocument(mutate, p, name);
  }
}

/** Date degli impegni dei passaggi e impegni (dei passaggi o collegati) a cui si possono allegare file. */
function useProcedureEventInfo(p: Procedure, steps: ProcedureStep[]) {
  const { data: events = [] } = useProcedureEvents(
    steps.map((s) => s.event_id).filter((eid): eid is string => !!eid),
  );
  const { data: linked = [] } = useLinkedEvents('procedure', p.id);
  const eventDates = new Map(events.map((e) => [e.id, e.starts_at]));
  const docEvents = [
    ...new Map([...events, ...linked].map((e) => [e.id, { id: e.id, title: e.title }])).values(),
  ];
  return { eventDates, docEvents };
}

function ProcedureView({ procedure: p, onDeleted }: { procedure: Procedure; onDeleted: () => void }) {
  const { spaceById, memberName, canWrite } = useSpace();
  const mutate = useMutate();
  const toast = useToast();
  const dialog = useDialog();
  const [openStep, setOpenStep] = useState<ProcedureStep | null>(null);
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<ProcedureTab>('passaggi');

  const steps = sortedSteps(p);
  const { eventDates, docEvents } = useProcedureEventInfo(p, steps);
  const done = steps.filter((s) => s.done_at).length;
  const writable = canWrite(p.space_id);
  const space = spaceById(p.space_id);

  async function onToggle(step: ProcedureStep) {
    if (!writable) {
      return;
    }
    if (await toggleStep(mutate, p, step)) {
      toast('Pratica completata');
    }
  }

  return (
    <div style={{ ['--space' as string]: spaceColor(space?.color_hue) }}>
      <TopBar writable={writable} onEdit={() => setEditing(true)} />
      <ProcedureHeader
        procedure={p}
        spaceName={space?.name}
        ownerName={p.owner_id ? memberName(p.owner_id) : null}
        done={done}
        total={steps.length}
      />

      <ProcedureTabs
        tab={tab}
        onTab={setTab}
        missingDocs={p.procedure_docs.filter((d) => !d.attachment_id).length}
      />

      {tab === 'passaggi' && (
        <>
          <PhaseSummary steps={steps} />

          <StepList
            steps={steps}
            eventDates={eventDates}
            writable={writable}
            onToggle={onToggle}
            onOpen={setOpenStep}
            onMove={(step, delta) => void moveStep(mutate, p, step.id, delta)}
          />
          {writable && <AddStepForm onAdd={(title) => void addStep(mutate, p, title)} />}
        </>
      )}

      {tab === 'cronologia' && (
        <ProcedureTimeline
          procedureId={p.id}
          spaceId={p.space_id}
          steps={steps}
          eventDates={eventDates}
          hue={space?.color_hue ?? 42}
        />
      )}

      {tab === 'documenti' && (
        <DocsSection
          procedure={p}
          steps={steps}
          events={docEvents}
          writable={writable}
          onAdd={() => void askRequiredDocument(dialog, mutate, p)}
        />
      )}

      {openStep && (
        <StepSheet
          step={openStep}
          procedure={p}
          linkedAt={openStep.event_id ? eventDates.get(openStep.event_id) : undefined}
          writable={writable}
          onClose={() => setOpenStep(null)}
        />
      )}
      {editing && (
        <EditProcedureSheet
          procedure={p}
          members={space?.space_members ?? []}
          onClose={() => setEditing(false)}
          onDeleted={onDeleted}
        />
      )}
    </div>
  );
}
