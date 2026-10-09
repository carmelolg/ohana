import { describe, expect, it } from 'vitest';
import { romeToDate } from '@ohana/shared';
import { fakeMutate } from '../../test-utils/fakeMutate';
import type { Medication } from '../types';
import { parseReadings, saveVisitOutcome, type VisitOutcome } from './careVisit';

const med = (over: Partial<Medication> = {}): Medication => ({
  id: 'med1',
  space_id: 's1',
  recipient_id: 'r1',
  thread_id: 't1',
  name: 'Bisoprololo',
  strength: '1,25 mg',
  dose_units: 1,
  unit: 'cpr',
  schedule: ['08:00'],
  notes: null,
  stock_units: 20,
  stock_as_of: '2026-10-01T00:00:00Z',
  package_units: 28,
  prescriber: null,
  refill_by: null,
  plan_expires_at: null,
  plan_issuer: null,
  active: true,
  created_at: '2026-01-01T00:00:00Z',
  ...over,
});

const outcome = (over: Partial<VisitOutcome> = {}): VisitOutcome => ({
  entryId: 'entry1',
  spaceId: 's1',
  recipientId: 'r1',
  threadId: 't1',
  threadTitle: 'Morbo di Crohn',
  doctor: 'Dott.ssa Leoni',
  visit: {
    id: 'ev1',
    title: 'Controllo',
    startsAt: romeToDate(2026, 10, 28, 11, 0),
    contactId: 'c1',
    assigneeId: 'u1',
  },
  text: 'Calprotectina in calo.',
  readings: {},
  medication: null,
  nextCheckMonths: null,
  followUps: [],
  scadenzaCategoryId: 'cat-scadenza',
  ...over,
});

describe('valori scritti nel modulo', () => {
  it('numeri e pressione; i campi vuoti o illeggibili spariscono', () => {
    expect(
      parseReadings({
        calprotectin_ugg: '180',
        crp_mgdl: '0,6',
        blood_pressure: '132/80',
        weight: '',
        heart_rate: 'boh',
      }),
    ).toEqual({ calprotectin_ugg: 180, crp_mgdl: 0.6, blood_pressure: '132/80' });
    expect(parseReadings({ blood_pressure: 'alta' })).toEqual({});
  });
});

describe('chiusura di una visita', () => {
  it("con solo il testo: tassello nel filone e collegamento dell'impegno", async () => {
    const f = fakeMutate();
    await saveVisitOutcome(f.mutate, outcome());
    expect(f.steps()).toEqual(['upsert:care_entries', 'update:events']);
    expect(f.payloadAt(0)).toMatchObject({
      id: 'entry1',
      thread_id: 't1',
      recipient_id: 'r1',
      type: 'visita',
      entry_date: '2026-10-28',
      title: 'Controllo',
      text: 'Calprotectina in calo.',
      event_id: 'ev1',
      follow_ups: [],
    });
    expect(f.calls[1].op).toMatchObject({ payload: { care_thread_id: 't1' }, match: { id: 'ev1' } });
  });

  it('i valori misurati vanno nel tassello e nei grafici', async () => {
    const f = fakeMutate();
    await saveVisitOutcome(
      f.mutate,
      outcome({ readings: { blood_pressure: '132/80', calprotectin_ugg: '180' } }),
    );
    expect(f.payloadAt(0)).toMatchObject({ readings: { blood_pressure: '132/80', calprotectin_ugg: 180 } });
    expect(f.steps().filter((s) => s === 'upsert:measurements')).toHaveLength(1);
    expect(f.payloadOf('measurements')).toMatchObject({
      payload: { type: 'blood_pressure', value: 132, value2: 80 },
    });
  });

  it('un cambio di terapia aggiorna il farmaco e aggiunge un tassello «terapia»', async () => {
    const f = fakeMutate();
    await saveVisitOutcome(
      f.mutate,
      outcome({ medication: { med: med(), strength: '2,5 mg', doseUnits: 1 } }),
    );
    expect(f.steps()).toEqual([
      'upsert:care_entries',
      'update:medications',
      'upsert:care_entries',
      'update:events',
    ]);
    expect(f.calls[1].op).toMatchObject({
      payload: { strength: '2,5 mg', dose_units: 1 },
      match: { id: 'med1' },
    });
    expect(f.payloadAt(2)).toMatchObject({
      type: 'terapia',
      title: 'Bisoprololo da 1,25 mg a 2,5 mg',
      text: 'Deciso dal Dott.ssa Leoni.',
      medication_id: 'med1',
      thread_id: 't1',
    });
  });
});

describe('prossimi passi dopo la visita', () => {
  it('il prossimo controllo crea un impegno con promemoria e lo annota nel tassello', async () => {
    const f = fakeMutate();
    await saveVisitOutcome(f.mutate, outcome({ nextCheckMonths: 3 }));
    expect(f.steps()).toEqual([
      'upsert:events',
      'upsert:event_reminders',
      'upsert:care_entries',
      'update:events',
    ]);
    const event = f.payloadAt<{
      title: string;
      starts_at: string;
      care_thread_id: string;
      category_id: string;
    }>(0);
    expect(event).toMatchObject({
      title: 'Controllo morbo di crohn',
      care_thread_id: 't1',
      category_id: 'cat-scadenza',
    });
    expect(event.starts_at).toBe(romeToDate(2027, 1, 28, 9, 0).toISOString());
    expect(f.payloadAt(1)).toMatchObject({ offset_minutes: 7 * 1440 });
    const entry = f.payloadAt<{ follow_ups: { title: string; due_date: string; event_id: string }[] }>(2);
    expect(entry.follow_ups).toEqual([
      {
        title: 'Prossimo controllo',
        due_date: '2027-01-28',
        due_hint: 'tra 3 mesi',
        event_id: expect.any(String),
      },
    ]);
  });

  it('i prossimi passi con data diventano impegni; senza data restano nel tassello', async () => {
    const f = fakeMutate();
    await saveVisitOutcome(
      f.mutate,
      outcome({
        followUps: [
          { title: 'Holter 24 h', dueDate: '2026-12-31', hint: '' },
          { title: 'Esami del sangue', dueDate: '', hint: 'entro gennaio' },
          { title: '   ', dueDate: '', hint: '' },
        ],
      }),
    );
    expect(f.steps().filter((s) => s === 'upsert:events')).toHaveLength(1);
    const entry = f.payloadAt<{
      follow_ups: { title: string; event_id: string | null; due_hint: string | null }[];
    }>(2);
    expect(entry.follow_ups).toMatchObject([
      { title: 'Holter 24 h', event_id: expect.any(String) },
      { title: 'Esami del sangue', event_id: null, due_hint: 'entro gennaio' },
    ]);
  });

  it("se una scrittura fallisce, l'errore arriva alla schermata", async () => {
    const f = fakeMutate((op) => op.table === 'care_entries');
    await expect(saveVisitOutcome(f.mutate, outcome())).rejects.toThrow('scrittura rifiutata');
  });
});
