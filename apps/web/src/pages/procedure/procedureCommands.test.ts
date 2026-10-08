import { describe, expect, it } from 'vitest';
import { fakeMutate } from '../../test-utils/fakeMutate';
import type { Procedure, ProcedureStep } from '../../lib/types';
import { addStep, createProcedure, patchProcedure, toggleStep } from './procedureCommands';
import { findProcedureTemplate } from '@ohana/shared';

const step = (id: string, position: number, done: boolean): ProcedureStep => ({
  id,
  procedure_id: 'p1',
  position,
  title: id,
  note: null,
  done_at: done ? '2026-10-01T00:00:00Z' : null,
  event_id: null,
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
