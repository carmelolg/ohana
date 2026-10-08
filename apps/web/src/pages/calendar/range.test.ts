import { describe, expect, it } from 'vitest';
import { romeParts, romeToDate } from '@ohana/shared';
import type { Occurrence } from '../../lib/types';
import { groupByDay, mondayOf, rangeFor, stepCursor } from './range';

const at = (d: number, h = 9) => romeToDate(2026, 10, d, h, 0);

describe('intervalli del calendario', () => {
  it('il lunedì della settimana (8 ott 2026 è giovedì)', () => {
    expect(romeParts(mondayOf(at(8))).d).toBe(5);
    expect(romeParts(mondayOf(at(5))).d).toBe(5);
    expect(romeParts(mondayOf(at(11))).d).toBe(5); // domenica
  });
  it('mese: 42 giorni a partire dal lunedì che contiene il primo', () => {
    const { from, to, title } = rangeFor('mese', at(15));
    expect(romeParts(from)).toMatchObject({ y: 2026, m: 9, d: 28 });
    expect(Math.round((+to - +from) / 86_400_000)).toBe(42);
    expect(title).toBe('ottobre 2026');
  });
  it('settimana e lista', () => {
    expect(rangeFor('settimana', at(8)).title).toBe('Settimana del 5 ottobre');
    expect(rangeFor('lista', at(8)).title).toBe('Prossimi 30 giorni');
  });
  it('passi: mese per mese, altrimenti 7 o 30 giorni', () => {
    expect(romeParts(stepCursor('mese', at(15), 1))).toMatchObject({ m: 11, d: 1 });
    expect(romeParts(stepCursor('mese', at(15), -1))).toMatchObject({ m: 9, d: 1 });
    expect(romeParts(stepCursor('settimana', at(8), 1)).d).toBe(15);
    expect(romeParts(stepCursor('lista', at(8), -1))).toMatchObject({ m: 9, d: 8 });
  });
  it('raggruppa per giorno in ordine', () => {
    const o = (d: number, h: number) => ({ key: `${d}${h}`, at: at(d, h) }) as Occurrence;
    const groups = groupByDay([o(9, 10), o(8, 15), o(9, 8)]);
    expect(groups.map(([, l]) => l.length)).toEqual([1, 2]);
    expect(groups[0][0]).toBeLessThan(groups[1][0]);
  });
});
