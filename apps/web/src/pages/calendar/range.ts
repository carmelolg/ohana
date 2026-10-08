import { addDaysRome, romeParts, romeToDate, startOfDayRome } from '@ohana/shared';
import type { Occurrence } from '../../lib/types';

export type View = 'lista' | 'settimana' | 'mese';

const MONTH = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', month: 'long', year: 'numeric' });
const MONTH_NAME = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', month: 'long' });
const LIST_DAYS = 30;
const WEEK_DAYS = 7;
export const MONTH_CELLS = 42;

export const mondayOf = (d: Date) => addDaysRome(startOfDayRome(d), -((romeParts(d).dow + 6) % 7));

/** Intervallo mostrato (da incluso, a escluso) e titolo per la vista e la data scelte. */
export function rangeFor(view: View, cursor: Date): { from: Date; to: Date; title: string } {
  if (view === 'mese') {
    const p = romeParts(cursor);
    const first = romeToDate(p.y, p.m, 1);
    const from = mondayOf(first);
    return { from, to: addDaysRome(from, MONTH_CELLS), title: MONTH.format(first) };
  }
  if (view === 'settimana') {
    const from = mondayOf(cursor);
    return {
      from,
      to: addDaysRome(from, WEEK_DAYS),
      title: `Settimana del ${romeParts(from).d} ${MONTH_NAME.format(from)}`,
    };
  }
  const from = startOfDayRome(cursor);
  return { from, to: addDaysRome(from, LIST_DAYS), title: 'Prossimi 30 giorni' };
}

/** Sposta la data di riferimento di un passo avanti (+1) o indietro (-1) nella vista. */
export function stepCursor(view: View, cursor: Date, dir: number): Date {
  if (view === 'mese') {
    const p = romeParts(cursor);
    return romeToDate(p.y, p.m + dir, 1);
  }
  return addDaysRome(cursor, dir * (view === 'settimana' ? WEEK_DAYS : LIST_DAYS));
}

/** Raggruppa per giorno (mezzanotte di Roma), in ordine cronologico. */
export function groupByDay(occ: Occurrence[]): [number, Occurrence[]][] {
  const byDay = new Map<number, Occurrence[]>();
  for (const o of occ) {
    const key = startOfDayRome(o.at).getTime();
    byDay.set(key, [...(byDay.get(key) ?? []), o]);
  }
  return [...byDay.entries()].sort((a, b) => a[0] - b[0]);
}
