import { describe, expect, it } from 'vitest';
import {
  capitalize,
  escapeRegExp,
  fullName,
  isoDayRome,
  minutesOfDayRome,
  normalizeText,
  romeToDate,
  shortName,
  stripRrulePrefix,
} from '../src';

describe('text', () => {
  it('normalizeText toglie accenti e maiuscole', () =>
    expect(normalizeText('Caffè DELLA Nonna')).toBe('caffe della nonna'));
  it('capitalize non tocca il resto e accetta la stringa vuota', () => {
    expect(capitalize('visita Rossi')).toBe('Visita Rossi');
    expect(capitalize('')).toBe('');
  });
  it('escapeRegExp rende letterali i metacaratteri', () =>
    expect(new RegExp(escapeRegExp('a.b(c)')).test('a.b(c)')).toBe(true));
});

describe('people', () => {
  const p = { first_name: 'Giulia', last_name: 'Neri', nickname: null };
  it("fullName: nome e cognome, o il soprannome se c'è", () => {
    expect(fullName(p)).toBe('Giulia Neri');
    expect(fullName({ ...p, nickname: ' Giuly ' })).toBe('Giuly');
    expect(fullName(null)).toBe('');
  });
  it("shortName: nome, o il soprannome se c'è", () => {
    expect(shortName(p)).toBe('Giulia');
    expect(shortName({ ...p, nickname: 'Giuly' })).toBe('Giuly');
    expect(shortName(undefined)).toBe('');
  });
});

describe('date di Roma', () => {
  it('isoDayRome usa il giorno di Roma, non quello UTC', () => {
    expect(isoDayRome(romeToDate(2026, 10, 8, 0, 30))).toBe('2026-10-08'); // 22:30 UTC del 7
    expect(isoDayRome(romeToDate(2026, 1, 5, 23, 59))).toBe('2026-01-05');
  });
  it('minutesOfDayRome', () => expect(minutesOfDayRome(romeToDate(2026, 10, 8, 7, 45))).toBe(7 * 60 + 45));
});

describe('stripRrulePrefix', () => {
  it('accetta la regola con o senza prefisso', () => {
    expect(stripRrulePrefix('RRULE:FREQ=DAILY')).toBe('FREQ=DAILY');
    expect(stripRrulePrefix('FREQ=DAILY')).toBe('FREQ=DAILY');
  });
});
