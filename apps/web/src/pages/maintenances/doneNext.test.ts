import { describe, expect, it } from 'vitest';
import { romeToDate } from '@ohana/shared';
import { nextAfter } from './DoneSheet';

describe('prossima manutenzione dopo «fatta»', () => {
  const now = romeToDate(2026, 10, 8, 10, 0);
  it("senza data non c'è", () => {
    expect(nextAfter('FREQ=YEARLY', null, now)).toBeNull();
  });
  it('annuale: un anno dopo la data di esecuzione', () => {
    const next = nextAfter('FREQ=YEARLY', romeToDate(2026, 10, 1, 9, 0), now);
    expect(next?.getFullYear()).toBe(2027);
  });
  it('regola non valida non fa crollare', () => {
    expect(nextAfter('FREQ=NOPE', romeToDate(2026, 10, 1, 9, 0), now)).toBeNull();
  });
});
