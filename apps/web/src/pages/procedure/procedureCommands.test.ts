import { describe, expect, it } from 'vitest';
import { fakeMutate } from '../../test-utils/fakeMutate';
import type { Procedure, ProcedureStep } from '../../lib/types';
import {
  addStep,
  assignDoc,
  createProcedure,
  moveStep,
  patchProcedure,
  toggleStep,
} from './procedureCommands';
import { findProcedureTemplate } from '@ohana/shared';

const step = (id: string, position: number, done: boolean): ProcedureStep => ({
  id,
  procedure_id: 'p1',
  position,
  title: id,
  note: null,
  done_at: done ? '2026-10-01T00:00:00Z' : null,
  event_id: null,
  amount: null,
  contact_id: null,
  quote_outcome: null,
});
const procedure = (steps: ProcedureStep[], status: Procedure['status'] = 'in_corso'): Procedure =>
  ({
    id: 'p1',
    space_id: 's1',
    title: 'ISEE',
    owner_id: null,
    due_date: null,
    status,
    procedure_steps: steps,
    procedure_docs: [],
  }) as unknown as Procedure;

describe('toggleStep', () => {
  it("completare l'ultimo passaggio completa la pratica", async () => {
    const { mutate, steps, payloadOf } = fakeMutate();
    const p = procedure([step('a', 0, true), step('b', 1, false)]);
    expect(await toggleStep(mutate, p, p.procedure_steps[1])).toBe(true);
    expect(steps()).toEqual(['update:procedure_steps', 'update:procedures']);
    expect(payloadOf('procedures')!.payload).toEqual({ status: 'completata' });
  });

  it('riaprire un passaggio di una pratica completata la rimette in corso', async () => {
    const { mutate, payloadOf } = fakeMutate();
    const p = procedure([step('a', 0, true), step('b', 1, true)], 'completata');
    expect(await toggleStep(mutate, p, p.procedure_steps[1])).toBe(false);
    expect(payloadOf('procedures')!.payload).toEqual({ status: 'in_corso' });
  });

  it('un passaggio intermedio non cambia lo stato', async () => {
    const { mutate, steps } = fakeMutate();
    const p = procedure([step('a', 0, false), step('b', 1, false)]);
    await toggleStep(mutate, p, p.procedure_steps[0]);
    expect(steps()).toEqual(['update:procedure_steps']);
  });
});

describe('addStep / patchProcedure', () => {
  it('aggiunge in coda e riapre una pratica completata', async () => {
    const { mutate, steps, payloadOf } = fakeMutate();
    await addStep(mutate, procedure([step('a', 0, true)], 'completata'), 'Nuovo');
    expect(steps()).toEqual(['upsert:procedure_steps', 'update:procedures']);
    expect(payloadOf('procedure_steps')!.payload).toMatchObject({
      title: 'Nuovo',
      position: 1,
      procedure_id: 'p1',
    });
  });

  it("l'aggiornamento ottimistico tocca solo la pratica indicata", () => {
    const [update] = patchProcedure('p1', (p) => ({ ...p, title: 'Cambiato' }));
    const cache = [
      { id: 'p1', title: 'ISEE' },
      { id: 'p2', title: 'Altra' },
    ];
    expect(update.key).toEqual(['procedures']);
    expect(update.patch(cache)).toEqual([
      { id: 'p1', title: 'Cambiato' },
      { id: 'p2', title: 'Altra' },
    ]);
  });
});

describe('createProcedure', () => {
  it("crea pratica, passaggi e documenti del modello, in quest'ordine", async () => {
    const { mutate, steps, payloadAt } = fakeMutate();
    const template = findProcedureTemplate('isee')!;
    await createProcedure(mutate, {
      id: 'p9',
      spaceId: 's1',
      title: 'ISEE 2027',
      ownerId: '',
      dueDate: '',
      template,
    });
    expect(steps()).toEqual(['upsert:procedures', 'upsert:procedure_steps', 'upsert:procedure_docs']);
    expect(payloadAt<{ owner_id: null; due_date: null; template_key: string }>(0)).toMatchObject({
      owner_id: null,
      due_date: null,
      template_key: 'isee',
    });
    expect(payloadAt<{ position: number }[]>(1).map((s) => s.position)).toEqual(
      template.steps.map((_, i) => i),
    );
  });
  it('la pratica personalizzata non ha passaggi né documenti', async () => {
    const { mutate, steps } = fakeMutate();
    const template = findProcedureTemplate('custom')!;
    await createProcedure(mutate, {
      id: 'p9',
      spaceId: 's1',
      title: 'Altro',
      ownerId: 'u1',
      dueDate: '2026-12-01',
      template,
    });
    expect(steps()).toEqual(['upsert:procedures']);
  });
});

describe('moveStep', () => {
  it('sposta il passaggio e rinumera le posizioni in una sola scrittura', async () => {
    const { mutate, steps, payloadAt } = fakeMutate();
    const p = procedure([step('a', 0, false), step('b', 1, false), step('c', 2, false)]);
    await moveStep(mutate, p, 'c', -1);
    expect(steps()).toEqual(['upsert:procedure_steps']);
    expect(payloadAt<ProcedureStep[]>(0).map((s) => [s.id, s.position])).toEqual([
      ['a', 0],
      ['c', 1],
      ['b', 2],
    ]);
  });

  it('ai bordi non scrive nulla', async () => {
    const { mutate, calls } = fakeMutate();
    const p = procedure([step('a', 0, false), step('b', 1, false)]);
    await moveStep(mutate, p, 'a', -1);
    await moveStep(mutate, p, 'b', 1);
    expect(calls).toHaveLength(0);
  });
});

describe('assignDoc', () => {
  const file = { attachmentId: 'f1', name: 'preventivo.pdf', docId: 'd1' };

  it('legare un documento a un impegno svuota la fase', async () => {
    const { mutate, steps, payloadAt } = fakeMutate();
    await assignDoc(mutate, procedure([]), file, { kind: 'event', id: 'e1' });
    expect(steps()).toEqual(['update:attachments', 'update:procedure_docs']);
    expect(payloadAt(0)).toEqual({ event_id: 'e1' });
    expect(payloadAt(1)).toEqual({ step_id: null });
  });

  it('un allegato nato su un impegno e legato a una fase diventa un documento della pratica', async () => {
    const { mutate, steps, payloadAt } = fakeMutate();
    await assignDoc(mutate, procedure([]), { ...file, docId: null }, { kind: 'step', id: 'a' });
    expect(steps()).toEqual(['update:attachments', 'upsert:procedure_docs']);
    expect(payloadAt(0)).toEqual({ event_id: null });
    expect(payloadAt<{ step_id: string }>(1).step_id).toBe('a');
  });

  it("spostare un allegato da impegno a impegno cambia solo l'allegato", async () => {
    const { mutate, steps } = fakeMutate();
    await assignDoc(mutate, procedure([]), { ...file, docId: null }, { kind: 'event', id: 'e2' });
    expect(steps()).toEqual(['update:attachments']);
  });
});
