import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BackLink } from '../components/BackLink';
import { spaceColor } from '../lib/color';
import { useMutate, useProcedureEvents, useProcedures, useSpace } from '../lib/data';
import { useDialog } from '../lib/dialog';
import { useToast } from '../lib/toast';
import type { Procedure, ProcedureStep } from '../lib/types';
import { AddStepForm } from './procedure/AddStepForm';
import { DocChips } from './procedure/DocChips';
import { ProcedureHeader } from './procedure/ProcedureHeader';
import { EditProcedureSheet } from './procedure/EditProcedureSheet';
import { addRequiredDocument, addStep, sortedSteps, toggleStep } from './procedure/procedureCommands';
import { StepList } from './procedure/StepList';
import { StepSheet } from './procedure/StepSheet';

/** Dettaglio di una pratica (3e): avanzamento, passaggi e documenti richiesti. */
export default function ProcedureDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { data: list = [], isLoading } = useProcedures();
  const procedure = list.find((x) => x.id === id);
  if (isLoading) {
    return <div className="empty">Caricamento…</div>;
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

function DocsHeader({
  procedure: p,
  writable,
  onAdd,
}: {
  procedure: Procedure;
  writable: boolean;
  onAdd: () => void;
}) {
  const uploaded = p.procedure_docs.filter((d) => d.attachment_id).length;
  return (
    <div className="hstack" style={{ justifyContent: 'space-between', margin: '18px 8px 8px' }}>
      <span className="label">
        Documenti{p.procedure_docs.length ? ` · ${uploaded} di ${p.procedure_docs.length} caricati` : ''}
      </span>
      {writable && (
        <button className="pill" onClick={onAdd}>
          + Documento
        </button>
      )}
    </div>
  );
}

function ProcedureView({ procedure: p, onDeleted }: { procedure: Procedure; onDeleted: () => void }) {
  const { spaceById, memberName, canWrite } = useSpace();
  const mutate = useMutate();
  const toast = useToast();
  const dialog = useDialog();
  const [openStep, setOpenStep] = useState<ProcedureStep | null>(null);
  const [editing, setEditing] = useState(false);

  const steps = sortedSteps(p);
  const { data: events = [] } = useProcedureEvents(
    steps.map((s) => s.event_id).filter((eid): eid is string => !!eid),
  );
  const eventDates = new Map(events.map((e) => [e.id, e.starts_at]));
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

  async function onAddDocument() {
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

  return (
    <div style={{ ['--space' as string]: spaceColor(space?.color_hue) }}>
      <div className="hstack" style={{ justifyContent: 'space-between' }}>
        <BackLink to="/pratiche" label="Pratiche" />
        {writable && (
          <button className="btn ghost small" style={{ marginTop: 6 }} onClick={() => setEditing(true)}>
            Modifica
          </button>
        )}
      </div>
      <ProcedureHeader
        procedure={p}
        spaceName={space?.name}
        ownerName={p.owner_id ? memberName(p.owner_id) : null}
        done={done}
        total={steps.length}
      />

      <StepList
        steps={steps}
        eventDates={eventDates}
        writable={writable}
        onToggle={onToggle}
        onOpen={setOpenStep}
      />
      {writable && <AddStepForm onAdd={(title) => void addStep(mutate, p, title)} />}

      <DocsHeader procedure={p} writable={writable} onAdd={onAddDocument} />
      <DocChips procedure={p} writable={writable} />

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
