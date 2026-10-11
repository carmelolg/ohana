import { describe, expect, it } from 'vitest';
import type { ProcedureStep } from '../../lib/types';
import { advanceLabel, euroShort, nextStep, quotesOf, totalCents } from './phases';

const step = (over: Partial<ProcedureStep>): ProcedureStep => ({
  id: 's',
  procedure_id: 'p',
  position: 0,
  title: 'Fase',
  note: null,
  done_at: null,
  event_id: null,
  amount: null,
  contact_id: null,
  quote_outcome: null,
  ...over,
});

describe('fasi di un intervento', () => {
  const steps = [
    step({
      id: 'a',
      title: 'Primo preventivo',
      done_at: '2026-09-12T10:00:00Z',
      amount: 3200,
      quote_outcome: 'scartato',
    }),
    step({
      id: 'b',
      title: 'Secondo preventivo',
      done_at: '2026-09-20T10:00:00Z',
      amount: 2850.1,
      quote_outcome: 'scelto',
    }),
    step({ id: 'c', title: 'Lavori' }),
  ];
  it('la fase successiva è la prima non fatta', () => {
    expect(nextStep(steps)?.id).toBe('c');
    expect(advanceLabel(steps)).toBe('Segna fatto: Lavori');
    expect(advanceLabel(steps.map((s) => ({ ...s, done_at: 'x' })))).toBe('');
  });
  it('i preventivi sono le fasi con un esito', () => {
    expect(quotesOf(steps).map((s) => s.id)).toEqual(['a', 'b']);
  });
  it('il totale esclude i preventivi scartati ed è in centesimi interi', () => {
    expect(totalCents(steps)).toBe(285010);
  });
  it('importi senza decimali inutili', () => {
    expect(euroShort(3200)).toMatch(/^3200\s€$/);
  });
});
