import { describe, expect, it } from 'vitest';
import { romeToDate } from '@ohana/shared';
import type { CareThread, EventRow, Medication } from '../../lib/types';
import { buildVisitOutcome, initialVisitCloseForm, visitCloseError } from './visitClose';

const thread = {
  id: 't1',
  recipient_id: 'r1',
  title: 'Morbo di Crohn',
  doctor: 'Dott.ssa Leoni',
} as CareThread;
const visit = {
  id: 'ev1',
  space_id: 's1',
  title: 'Controllo',
  starts_at: romeToDate(2026, 10, 28, 11).toISOString(),
  contact_id: 'c1',
  assignee_id: 'u1',
  contacts: null,
} as unknown as EventRow; // solo i campi che la funzione legge
const meds = [{ id: 'm1', name: 'Azatioprina', strength: '50 mg', dose_units: 1 }] as Medication[];

describe('chiusura visita: modulo', () => {
  it('serve solo il filone', () => {
    expect(visitCloseError(initialVisitCloseForm(''), meds)).toMatch(/filone/);
    expect(visitCloseError(initialVisitCloseForm('t1'), meds)).toBeNull();
  });

  it('una terapia modificata ha bisogno di una dose valida', () => {
    const f = { ...initialVisitCloseForm('t1'), changeMedId: 'm1' };
    expect(visitCloseError(f, meds)).toBeNull(); // dose invariata
    expect(visitCloseError({ ...f, newDoseUnits: '0' }, meds)).toMatch(/dose/);
    expect(visitCloseError({ ...f, changeMedId: 'sconosciuto' }, meds)).toMatch(/dose/);
  });

  it('i dati da salvare: nessuna modifica di terapia, prossimi passi senza titolo scartati', () => {
    const f = {
      ...initialVisitCloseForm('t1'),
      text: 'Tutto stabile',
      followUps: [{ title: ' ', dueDate: '', hint: '' }],
    };
    const outcome = buildVisitOutcome(f, { entryId: 'e1', visit, thread, meds, scadenzaCategoryId: 'cat' });
    expect(outcome).toMatchObject({
      entryId: 'e1',
      spaceId: 's1',
      recipientId: 'r1',
      threadId: 't1',
      doctor: 'Dott.ssa Leoni',
      medication: null,
      followUps: [],
    });
  });

  it('la terapia modificata tiene i valori che non cambi', () => {
    const f = { ...initialVisitCloseForm('t1'), changeMedId: 'm1', newStrength: '75 mg' };
    const outcome = buildVisitOutcome(f, {
      entryId: 'e1',
      visit,
      thread,
      meds,
      scadenzaCategoryId: undefined,
    });
    expect(outcome.medication).toMatchObject({ strength: '75 mg', doseUnits: 1 });
  });
});
