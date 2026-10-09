import { describe, expect, it } from 'vitest';
import { romeToDate } from '@ohana/shared';
import { fakeMutate } from '../../test-utils/fakeMutate';
import {
  correctStock,
  createPlanReminder,
  markDoseTaken,
  refillDueDate,
  requestRefill,
  saveMedication,
  syncPlanReminder,
  unmarkDose,
} from './medications';

const target = { spaceId: 's1', medicationId: 'm1', day: '2026-10-28', slot: '08:00' };

describe('dosi', () => {
  it('segnare una dose è idempotente (una per terapia, giorno e orario) e aggiorna subito la cache', async () => {
    const f = fakeMutate();
    await markDoseTaken(f.mutate, { ...target, userId: 'u1' });
    expect(f.calls[0].op).toMatchObject({
      table: 'medication_doses',
      action: 'upsert',
      onConflict: 'medication_id,day,slot',
    });
    expect(f.payloadAt(0)).not.toHaveProperty('id');
    const patch = f.calls[0].optimistic![0].patch;
    expect(patch([])).toHaveLength(1);
    expect(patch(undefined)).toBeUndefined();
  });

  it('togliere la spunta cancella quella dose e la toglie dalla cache', async () => {
    const f = fakeMutate();
    await unmarkDose(f.mutate, target);
    expect(f.calls[0].op).toMatchObject({
      action: 'delete',
      match: { medication_id: 'm1', day: '2026-10-28', slot: '08:00' },
    });
    const doses = [
      { medication_id: 'm1', day: '2026-10-28', slot: '08:00' },
      { medication_id: 'm1', day: '2026-10-28', slot: '20:00' },
    ];
    expect(f.calls[0].optimistic![0].patch(doses)).toEqual([doses[1]]);
  });
});

describe('terapie', () => {
  it('corregge la scorta e fissa da quando si stima', async () => {
    const f = fakeMutate();
    const now = romeToDate(2026, 10, 28, 9, 0);
    await correctStock(f.mutate, 'm1', 18, now);
    expect(f.calls[0].op).toMatchObject({
      payload: { stock_units: 18, stock_as_of: now.toISOString() },
      match: { id: 'm1' },
    });
  });

  it('salva con gli orari in ordine e senza toccare la scorta se non cambia', async () => {
    const f = fakeMutate();
    await saveMedication(f.mutate, {
      id: 'm1',
      spaceId: 's1',
      recipientId: 'r1',
      threadId: null,
      name: ' Mesalazina ',
      strength: '800 mg',
      doseUnits: 2,
      unit: 'cpr',
      schedule: ['20:00', '08:00'],
      notes: '',
      packageUnits: 100,
      prescriber: '',
      refillBy: 'Dott.ssa Neri (MMG)',
      planExpiresAt: null,
      planIssuer: '',
      stock: null,
    });
    const payload = f.payloadAt<Record<string, unknown>>(0);
    expect(payload).toMatchObject({
      name: 'Mesalazina',
      schedule: ['08:00', '20:00'],
      notes: null,
      refill_by: 'Dott.ssa Neri (MMG)',
    });
    expect(payload).not.toHaveProperty('stock_units');
  });
});

describe('scadenze di cura come impegni', () => {
  const med = {
    id: 'm1',
    name: 'Mesalazina',
    space_id: 's1',
    refill_by: 'Dott.ssa Neri (MMG)',
    prescriber: 'Dott.ssa Leoni',
  };

  it('«Chiedi ricetta»: una commissione assegnata, collegata alla terapia', async () => {
    const f = fakeMutate();
    const due = romeToDate(2026, 11, 3, 9, 0);
    await requestRefill(f.mutate, { med, dueDate: due, assigneeId: 'luca', categoryId: 'cat' });
    expect(f.steps()).toEqual(['upsert:events', 'upsert:event_reminders']);
    expect(f.payloadAt(0)).toMatchObject({
      title: 'Ricetta mesalazina',
      assignee_id: 'luca',
      medication_id: 'm1',
      category_id: 'cat',
      starts_at: due.toISOString(),
      notes: 'Chiedere la ricetta a Dott.ssa Neri (MMG).',
    });
  });

  it('la ricetta si chiede il giorno prima che la scorta finisca, mai nel passato', () => {
    const now = romeToDate(2026, 10, 28, 15, 0);
    expect(refillDueDate(6, now).toISOString()).toBe(romeToDate(2026, 11, 2).toISOString());
    expect(refillDueDate(0, now).toISOString()).toBe(romeToDate(2026, 10, 28).toISOString());
  });

  it('il piano terapeutico scade in un giorno preciso e avvisa 30 giorni prima', async () => {
    const f = fakeMutate();
    await createPlanReminder(f.mutate, {
      med,
      expiresAt: romeToDate(2026, 11, 30, 9, 0),
      assigneeId: null,
      categoryId: undefined,
    });
    expect(f.payloadAt(0)).toMatchObject({ title: 'Piano terapeutico mesalazina', medication_id: 'm1' });
    expect(f.payloadAt(0)).not.toHaveProperty('category_id');
    expect(f.payloadAt(1)).toMatchObject({ offset_minutes: 30 * 1440 });
  });
});

describe('promemoria del piano terapeutico', () => {
  const base = {
    med: { id: 'm1', name: 'Azatioprina', space_id: 's1' },
    assigneeId: null,
    categoryId: 'cat',
  };

  it('con una data nuova crea il promemoria', async () => {
    const f = fakeMutate();
    await syncPlanReminder(f.mutate, { ...base, planDate: '2026-11-30', existingEventId: null });
    expect(f.steps()).toEqual(['upsert:events', 'upsert:event_reminders']);
  });

  it('se esiste già lo sposta, senza crearne un secondo', async () => {
    const f = fakeMutate();
    await syncPlanReminder(f.mutate, { ...base, planDate: '2026-12-15', existingEventId: 'ev1' });
    expect(f.steps()).toEqual(['update:events']);
    expect(f.calls[0].op).toMatchObject({
      match: { id: 'ev1' },
      payload: { starts_at: romeToDate(2026, 12, 15, 9).toISOString() },
    });
  });

  it('se la data viene tolta, elimina il promemoria; senza data né promemoria non fa nulla', async () => {
    const f = fakeMutate();
    await syncPlanReminder(f.mutate, { ...base, planDate: '', existingEventId: 'ev1' });
    expect(f.steps()).toEqual(['delete:events']);
    const g = fakeMutate();
    await syncPlanReminder(g.mutate, { ...base, planDate: '', existingEventId: null });
    expect(g.calls).toHaveLength(0);
  });
});
