import { describe, expect, it } from 'vitest';
import {
  describeRruleShort,
  describeRrule,
  expandOccurrences,
  nextOccurrence,
  romeParts,
  romeToDate,
} from '../src';

describe('ricorrenze', () => {
  it("mensile mantiene l'ora di Roma attraverso il cambio ora", () => {
    const start = romeToDate(2026, 9, 25, 10, 0);
    const occ = expandOccurrences(start, 'FREQ=MONTHLY', romeToDate(2026, 9, 1), romeToDate(2026, 12, 31));
    expect(occ.map((d) => romeParts(d)).map((p) => `${p.m}-${p.d} ${p.h}:${p.min}`)).toEqual([
      '9-25 10:0',
      '10-25 10:0',
      '11-25 10:0',
      '12-25 10:0',
    ]);
  });
  it('settimanale BYDAY', () => {
    const start = romeToDate(2026, 10, 12, 8, 0);
    const occ = expandOccurrences(
      start,
      'FREQ=WEEKLY;BYDAY=MO',
      romeToDate(2026, 10, 1),
      romeToDate(2026, 11, 1),
    );
    expect(occ).toHaveLength(3);
  });
  it("senza rrule: solo se nell'intervallo", () => {
    const d = romeToDate(2026, 10, 12, 8, 0);
    expect(expandOccurrences(d, null, romeToDate(2026, 10, 1), romeToDate(2026, 10, 31))).toEqual([d]);
    expect(expandOccurrences(d, null, romeToDate(2026, 11, 1), romeToDate(2026, 11, 30))).toEqual([]);
  });
  it('nextOccurrence', () => {
    const start = romeToDate(2026, 1, 15, 9, 0);
    const n = nextOccurrence(start, 'FREQ=YEARLY', romeToDate(2026, 6, 1))!;
    expect(romeParts(n)).toMatchObject({ y: 2027, m: 1, d: 15, h: 9 });
  });
  it('descrizione', () => {
    expect(describeRrule('FREQ=MONTHLY')).toBe('ogni mese');
    expect(describeRrule('FREQ=WEEKLY;INTERVAL=2')).toBe('ogni 2 settimane');
    expect(describeRrule(null)).toBe('Non si ripete');
  });
  it('etichette brevi', () => {
    expect(describeRruleShort('FREQ=WEEKLY;BYDAY=TH')).toBe('ogni gio');
    expect(describeRruleShort('FREQ=WEEKLY;BYDAY=MO,TH')).toBe('ogni lun e gio');
    expect(describeRruleShort('FREQ=DAILY;INTERVAL=3')).toBe('ogni 3 gg');
    expect(describeRruleShort('FREQ=MONTHLY')).toBe('ogni mese');
    expect(describeRruleShort(null)).toBe('');
  });
});
