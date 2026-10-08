import { DAY_MS, romeParts, romeToDate, startOfDayRome } from './dates';
import { nextOccurrence, stripRrulePrefix } from './recurrence';

const at9 = (d: Date) => {
  const p = romeParts(d);
  return romeToDate(p.y, p.m, p.d, 9, 0);
};

/** «ogni anno a novembre» senza giorno → primo del mese (altrimenti il giorno dipenderebbe da quando si è creata la manutenzione). */
export function normalizeMaintenanceRule(rrule: string): string {
  const r = stripRrulePrefix(rrule);
  if (/BYMONTH=/.test(r) && !/BYMONTHDAY=|BYDAY=/.test(r)) {
    return `${r};BYMONTHDAY=1`;
  }
  return r;
}

/**
 * Prossima scadenza di una manutenzione: la prima occorrenza della regola DOPO l'ultima volta in cui è stata fatta;
 * se non è mai stata fatta, dopo oggi. Restituisce sempre le 09:00 (ora di Roma) del giorno.
 */
export function nextMaintenanceDate(rrule: string, lastDoneAt: Date | null, now: Date): Date {
  const rule = normalizeMaintenanceRule(rrule);
  const start = at9(lastDoneAt ?? now);
  // dtstart non conforme (es. BYMONTHDAY=1) non è un'occorrenza: la prima occorrenza valida è comunque dopo `start`
  const next = nextOccurrence(start, rule, start);
  if (!next) {
    throw new Error('Ricorrenza senza occorrenze future');
  }
  return at9(next);
}

/** Giorni da oggi alla scadenza (negativo = in ritardo). */
export function daysUntil(due: Date, now: Date): number {
  const a = startOfDayRome(now).getTime();
  const b = startOfDayRome(due).getTime();
  return Math.round((b - a) / DAY_MS);
}
