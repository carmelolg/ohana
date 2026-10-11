import { describe, expect, it } from 'vitest';
import { pickNext } from './nextOccurrence';
import type { EventRow, Occurrence } from './types';

const occ = (key: string, at: string, allDay = false): Occurrence => ({
  key,
  at: new Date(at),
  event: { id: key, all_day: allDay } as EventRow,
});

describe('pickNext', () => {
  const now = new Date('2026-10-11T10:00:00Z');
  it('sceglie il primo impegno non ancora iniziato', () => {
    const list = [occ('a', '2026-10-11T08:00:00Z'), occ('b', '2026-10-11T12:00:00Z')];
    expect(pickNext(list, now)?.key).toBe('b');
  });
  it('ripiega sul primo aperto se sono tutti passati o tutto il giorno', () => {
    const list = [occ('a', '2026-10-11T08:00:00Z'), occ('b', '2026-10-11T00:00:00Z', true)];
    expect(pickNext(list, now)?.key).toBe('a');
  });
  it('senza impegni non c’è un prossimo', () => {
    expect(pickNext([], now)).toBeUndefined();
  });
});
