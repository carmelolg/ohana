import { describe, expect, it } from 'vitest';
import { romeToDate } from '@ohana/shared';
import { fromDateInput, fromDateTimeInput, toDateInput, toDateTimeInput } from './date-input';

describe('date-input (ora di Roma)', () => {
  it('andata e ritorno del datetime-local, anche dopo mezzanotte UTC', () => {
    const d = romeToDate(2026, 10, 8, 0, 30);
    expect(toDateTimeInput(d)).toBe('2026-10-08T00:30');
    expect(fromDateTimeInput('2026-10-08T00:30')?.getTime()).toBe(d.getTime());
  });
  it("il giorno scelto vale dalle 9:00 (o dall'ora indicata)", () => {
    expect(fromDateInput('2026-11-02')?.getTime()).toBe(romeToDate(2026, 11, 2, 9, 0).getTime());
    expect(fromDateInput('2026-11-02', 0)?.getTime()).toBe(romeToDate(2026, 11, 2, 0, 0).getTime());
  });
  it('valori vuoti o non validi', () => {
    expect(toDateInput(null)).toBe('');
    expect(toDateTimeInput(null)).toBe('');
    expect(fromDateInput('')).toBeNull();
    expect(fromDateInput('02/11/2026')).toBeNull();
    expect(fromDateTimeInput('boh')).toBeNull();
  });
});
