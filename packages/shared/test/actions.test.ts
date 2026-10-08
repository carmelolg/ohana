import { describe, expect, it } from 'vitest';
import { doneActionPatch, snoozeActionPatch } from '../src';

const base = { ends_at: null, status: 'open' as const };
describe('azioni', () => {
  it('fatto su singolo', () => {
    const p = doneActionPatch(
      { ...base, starts_at: '2026-10-07T08:00:00Z', rrule: null },
      new Date('2026-10-07T09:00:00Z'),
    );
    expect(p).toEqual({ status: 'done', last_done_at: '2026-10-07T09:00:00.000Z' });
  });
  it('fatto su ricorrente avanza', () => {
    const p = doneActionPatch(
      { ...base, starts_at: '2026-10-07T08:00:00Z', rrule: 'FREQ=MONTHLY' },
      new Date('2026-10-07T09:00:00Z'),
    );
    expect(p.last_done_at).toBe('2026-10-07T09:00:00.000Z');
    expect(p.starts_at).toBe('2026-11-07T09:00:00.000Z'); // 8:00Z estate -> 10:00 CEST; novembre 10:00 CET = 09:00Z
  });
  it('rimanda sposta; ricorrente no', () => {
    expect(
      snoozeActionPatch({ ...base, starts_at: '2026-10-07T08:00:00Z', rrule: null }, 60)!.starts_at,
    ).toBe('2026-10-07T09:00:00.000Z');
    expect(
      snoozeActionPatch({ ...base, starts_at: '2026-10-07T08:00:00Z', rrule: 'FREQ=DAILY' }, 60),
    ).toBeNull();
  });
});
