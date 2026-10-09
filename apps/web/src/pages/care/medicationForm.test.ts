import { describe, expect, it } from 'vitest';
import { romeToDate } from '@ohana/shared';
import type { Medication } from '../../lib/types';
import { buildMedication, initialMedForm, medFormError, stockText } from './medicationForm';

const now = romeToDate(2026, 10, 8, 9, 0);
const existing: Medication = {
  id: 'm1',
  space_id: 's1',
  recipient_id: 'r1',
  thread_id: 't1',
  name: 'Mesalazina',
  strength: '800 mg',
  dose_units: 2,
  unit: 'cpr',
  schedule: ['08:00', '20:00'],
  notes: null,
  stock_units: 24,
  stock_as_of: romeToDate(2026, 10, 8, 0, 0).toISOString(),
  package_units: 100,
  prescriber: 'Dott.ssa Leoni',
  refill_by: null,
  plan_expires_at: null,
  plan_issuer: null,
  active: true,
  created_at: '2026-01-01T00:00:00Z',
};
const ctx = (initial = initialMedForm(existing, [], now)) => ({
  id: 'm1',
  spaceId: 's1',
  recipientId: 'r1',
  existing,
  initial,
  now,
});

describe('modulo del farmaco', () => {
  it('chiede il nome, una dose valida, orari corretti e una scorta numerica', () => {
    const f = initialMedForm(null, [], now);
    expect(medFormError(f)).toBe('Scrivi il nome del farmaco');
    expect(medFormError({ ...f, name: 'X', doseUnits: '0' })).toMatch(/dose/);
    expect(medFormError({ ...f, name: 'X', schedule: ['8'] })).toMatch(/orari/);
    expect(medFormError({ ...f, name: 'X', stock: 'tanta' })).toMatch(/scorta/);
    expect(medFormError({ ...f, name: 'X', stock: '12,5' })).toBeNull();
  });

  it('un farmaco esistente si apre con la scorta stimata adesso', () => {
    expect(initialMedForm(existing, [], romeToDate(2026, 10, 9, 10, 0)).stock).toBe('18');
    expect(stockText(7.25)).toBe('7,3');
  });

  it('un farmaco nuovo registra la scorta da adesso', () => {
    const empty = initialMedForm(null, [], now);
    const saved = buildMedication(
      { ...empty, name: 'Pantoprazolo', stock: '12', packageUnits: '28' },
      { ...ctx(empty), existing: null },
    );
    expect(saved.stock).toEqual({ units: 12, asOf: now });
    expect(saved.packageUnits).toBe(28);
  });

  it('modificare altro non tocca la scorta', () => {
    const initial = initialMedForm(existing, [], now);
    expect(buildMedication({ ...initial, notes: 'a stomaco pieno' }, ctx(initial)).stock).toBeNull();
  });

  it('correggere la scorta a mano la riscrive da adesso', () => {
    const initial = initialMedForm(existing, [], now);
    expect(buildMedication({ ...initial, stock: '30' }, ctx(initial)).stock).toEqual({
      units: 30,
      asOf: now,
    });
  });

  it('cambiare orari o dose congela la stima di adesso', () => {
    const initial = initialMedForm(existing, [], now);
    const saved = buildMedication({ ...initial, schedule: ['08:00', '14:00', '20:00'] }, ctx(initial));
    expect(saved.stock).toEqual({ units: 22, asOf: now }); // 24 meno la dose delle 8:00 già trascorsa
    expect(saved.schedule).toEqual(['08:00', '14:00', '20:00']);
  });

  it('il piano terapeutico e i campi vuoti diventano nulli', () => {
    const initial = initialMedForm(existing, [], now);
    const saved = buildMedication({ ...initial, planDate: '2026-11-30', refillBy: '' }, ctx(initial));
    expect(saved).toMatchObject({ planExpiresAt: '2026-11-30', refillBy: '' });
    expect(buildMedication({ ...initial, planDate: '' }, ctx(initial)).planExpiresAt).toBeNull();
  });
});
