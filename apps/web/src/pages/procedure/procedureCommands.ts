import type { ProcedureTemplate } from '@ohana/shared';
import type { Mutate, OptimisticUpdate } from '../../lib/data';
import { newId } from '../../lib/outbox';
import type { Procedure, ProcedureStep } from '../../lib/types';

/** Aggiornamento ottimistico di una sola pratica nella cache `['procedures']`. */
export function patchProcedure(procedureId: string, change: (p: Procedure) => Procedure): OptimisticUpdate[] {
  return [
    {
      key: ['procedures'],
      patch: (old: unknown) =>
        ((old as Procedure[]) ?? []).map((p) => (p.id === procedureId ? change(p) : p)),
    },
  ];
}

export const sortedSteps = (p: Procedure): ProcedureStep[] =>
  [...p.procedure_steps].sort((a, b) => a.position - b.position);

/** Sposta il passaggio di `delta` posti (-1 su, +1 giù); fuori dai bordi l'ordine resta com'è. */
export function movedOrder(steps: ProcedureStep[], stepId: string, delta: number): ProcedureStep[] {
  const from = steps.findIndex((s) => s.id === stepId);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= steps.length) {
    return steps;
  }
  const next = [...steps];
  next.splice(to, 0, next.splice(from, 1)[0]);
  return next;
}

/** Riordina i passaggi: le posizioni diventano 0..n-1 nell'ordine dato, in una sola scrittura. */
export async function moveStep(mutate: Mutate, p: Procedure, stepId: string, delta: number): Promise<void> {
  const current = sortedSteps(p);
  const ordered = movedOrder(current, stepId, delta);
  if (ordered === current) {
    return;
  }
  const renumbered = ordered.map((s, position) => ({ ...s, position }));
  await mutate(
    { table: 'procedure_steps', action: 'upsert', payload: renumbered },
    patchProcedure(p.id, (x) => ({ ...x, procedure_steps: renumbered })),
  );
}

export async function setProcedureStatus(
  mutate: Mutate,
  p: Procedure,
  status: Procedure['status'],
): Promise<void> {
  await mutate(
    { table: 'procedures', action: 'update', payload: { status }, match: { id: p.id } },
    patchProcedure(p.id, (x) => ({ ...x, status })),
  );
}

/**
 * Spunta o toglie la spunta a un passaggio. Completando l'ultimo la pratica passa a «completata»,
 * riaprendone uno torna «in corso». Restituisce `true` se la pratica è appena stata completata.
 */
export async function toggleStep(mutate: Mutate, p: Procedure, step: ProcedureStep): Promise<boolean> {
  const doneAt = step.done_at ? null : new Date().toISOString();
  await mutate(
    { table: 'procedure_steps', action: 'update', payload: { done_at: doneAt }, match: { id: step.id } },
    patchProcedure(p.id, (x) => ({
      ...x,
      procedure_steps: x.procedure_steps.map((y) => (y.id === step.id ? { ...y, done_at: doneAt } : y)),
    })),
  );
  const steps = sortedSteps(p);
  const doneCount = steps.filter((y) => (y.id === step.id ? !!doneAt : !!y.done_at)).length;
  const allDone = steps.length > 0 && doneCount === steps.length;
  if (allDone && p.status !== 'completata') {
    await setProcedureStatus(mutate, p, 'completata');
    return true;
  }
  if (!allDone && p.status === 'completata') {
    await setProcedureStatus(mutate, p, 'in_corso');
  }
  return false;
}

export async function addStep(mutate: Mutate, p: Procedure, title: string): Promise<void> {
  const step = {
    id: newId(),
    procedure_id: p.id,
    position: p.procedure_steps.length,
    title,
    note: null,
    done_at: null,
    event_id: null,
    amount: null,
    contact_id: null,
    quote_outcome: null,
  };
  await mutate(
    { table: 'procedure_steps', action: 'upsert', payload: step },
    patchProcedure(p.id, (x) => ({ ...x, procedure_steps: [...x.procedure_steps, step] })),
  );
  if (p.status === 'completata') {
    await setProcedureStatus(mutate, p, 'in_corso');
  }
}

/** Cambia il nome di un documento della pratica (richiesto o caricato). */
export async function renameProcedureDoc(
  mutate: Mutate,
  p: Procedure,
  docId: string,
  name: string,
): Promise<void> {
  await mutate(
    { table: 'procedure_docs', action: 'update', payload: { name }, match: { id: docId } },
    patchProcedure(p.id, (x) => ({
      ...x,
      procedure_docs: x.procedure_docs.map((d) => (d.id === docId ? { ...d, name } : d)),
    })),
  );
}

export async function addRequiredDocument(mutate: Mutate, p: Procedure, name: string): Promise<void> {
  const doc = { id: newId(), procedure_id: p.id, name, attachment_id: null, step_id: null };
  await mutate(
    { table: 'procedure_docs', action: 'upsert', payload: doc },
    patchProcedure(p.id, (x) => ({ ...x, procedure_docs: [...x.procedure_docs, doc] })),
  );
}

/** Allega un file a una fase (preventivo, conferma d'ordine, fattura): è un documento della pratica legato alla fase. */
export async function attachToStep(
  mutate: Mutate,
  p: Procedure,
  step: ProcedureStep,
  file: { attachmentId: string; name: string },
): Promise<void> {
  const doc = {
    id: newId(),
    procedure_id: p.id,
    name: file.name,
    attachment_id: file.attachmentId,
    step_id: step.id,
  };
  await mutate(
    { table: 'procedure_docs', action: 'upsert', payload: doc },
    patchProcedure(p.id, (x) => ({ ...x, procedure_docs: [...x.procedure_docs, doc] })),
  );
}

/** Lega un documento a una fase (o lo slega con `null`): così compare sulla riga della fase nella cronologia. */
export async function setDocStep(
  mutate: Mutate,
  p: Procedure,
  docId: string,
  stepId: string | null,
): Promise<void> {
  await mutate(
    { table: 'procedure_docs', action: 'update', payload: { step_id: stepId }, match: { id: docId } },
    patchProcedure(p.id, (x) => ({
      ...x,
      procedure_docs: x.procedure_docs.map((d) => (d.id === docId ? { ...d, step_id: stepId } : d)),
    })),
  );
}

/** A cosa è legato un documento: una fase, un impegno o niente (generale). */
export type DocTarget = { kind: 'step' | 'event'; id: string } | null;

interface FileToAssign {
  attachmentId: string;
  name: string;
  /** Riga `procedure_docs` del file, se ce n'è già una (altrimenti è un allegato nato su un impegno). */
  docId: string | null;
}

/**
 * Lega un file a una fase, a un impegno o a nessuno dei due. Un file sta in un posto solo:
 * la fase vive su `procedure_docs.step_id`, l'impegno su `attachments.event_id`, quindi l'altro lato si svuota.
 */
export async function assignDoc(
  mutate: Mutate,
  p: Procedure,
  file: FileToAssign,
  target: DocTarget,
): Promise<void> {
  const eventId = target?.kind === 'event' ? target.id : null;
  const stepId = target?.kind === 'step' ? target.id : null;
  await mutate(
    {
      table: 'attachments',
      action: 'update',
      payload: { event_id: eventId },
      match: { id: file.attachmentId },
    },
    [],
  );
  if (file.docId) {
    await setDocStep(mutate, p, file.docId, stepId);
    return;
  }
  if (!eventId) {
    const doc = {
      id: newId(),
      procedure_id: p.id,
      name: file.name,
      attachment_id: file.attachmentId,
      step_id: stepId,
    };
    await mutate(
      { table: 'procedure_docs', action: 'upsert', payload: doc },
      patchProcedure(p.id, (x) => ({ ...x, procedure_docs: [...x.procedure_docs, doc] })),
    );
  }
}

export async function updateStep(
  mutate: Mutate,
  p: Procedure,
  stepId: string,
  changes: Partial<ProcedureStep>,
): Promise<void> {
  await mutate(
    { table: 'procedure_steps', action: 'update', payload: changes, match: { id: stepId } },
    patchProcedure(p.id, (x) => ({
      ...x,
      procedure_steps: x.procedure_steps.map((y) => (y.id === stepId ? { ...y, ...changes } : y)),
    })),
  );
}

export async function deleteStep(mutate: Mutate, p: Procedure, stepId: string): Promise<void> {
  await mutate(
    { table: 'procedure_steps', action: 'delete', match: { id: stepId } },
    patchProcedure(p.id, (x) => ({
      ...x,
      procedure_steps: x.procedure_steps.filter((y) => y.id !== stepId),
    })),
  );
}

interface CalendarLink {
  procedure: Procedure;
  step: ProcedureStep;
  at: Date;
  userId: string;
  /** Categoria «Burocrazia» dello spazio, se esiste. */
  categoryId: string | undefined;
  reminderMinutes: number;
}

/** Aggiunge il passaggio al calendario: crea l'impegno con un promemoria e lo collega al passaggio. */
export async function linkStepToCalendar(
  mutate: Mutate,
  { procedure, step, at, userId, categoryId, reminderMinutes }: CalendarLink,
): Promise<void> {
  const eventId = newId();
  await mutate({
    table: 'events',
    action: 'upsert',
    payload: {
      id: eventId,
      space_id: procedure.space_id,
      title: `${step.title} · ${procedure.title}`,
      ...(categoryId ? { category_id: categoryId } : {}),
      starts_at: at.toISOString(),
      created_by: userId,
    },
  });
  await mutate({
    table: 'event_reminders',
    action: 'upsert',
    payload: { id: newId(), event_id: eventId, offset_minutes: reminderMinutes, channels: ['email', 'push'] },
  });
  await updateStep(mutate, procedure, step.id, { event_id: eventId });
}

export interface NewProcedure {
  id: string;
  spaceId: string;
  title: string;
  ownerId: string;
  /** Data `aaaa-mm-gg`, vuota se non c'è scadenza. */
  dueDate: string;
  template: ProcedureTemplate;
}

/** Crea la pratica con i passaggi e i documenti richiesti dal modello. */
export async function createProcedure(mutate: Mutate, p: NewProcedure): Promise<void> {
  const { id, template } = p;
  await mutate({
    table: 'procedures',
    action: 'upsert',
    payload: {
      id,
      space_id: p.spaceId,
      title: p.title,
      owner_id: p.ownerId || null,
      due_date: p.dueDate || null,
      template_key: template.key,
    },
  });
  if (template.steps.length) {
    await mutate({
      table: 'procedure_steps',
      action: 'upsert',
      payload: template.steps.map((title, position) => ({ id: newId(), procedure_id: id, position, title })),
    });
  }
  if (template.docs.length) {
    await mutate({
      table: 'procedure_docs',
      action: 'upsert',
      payload: template.docs.map((name) => ({ id: newId(), procedure_id: id, name })),
    });
  }
}
