import { isoDayRome, romeParts, romeToDate } from '@ohana/shared';

const pad = (n: number) => String(n).padStart(2, '0');

// Valori dei campi <input type="date|datetime-local">: sempre ora di Roma, mai il fuso del dispositivo.

/** `YYYY-MM-DD` per `<input type="date">` (stringa vuota se manca la data). */
export const toDateInput = (d: Date | null): string => (d ? isoDayRome(d) : '');

/** Il giorno scelto vale dalle 9:00 (ora predefinita degli impegni) salvo `hour` diverso. */
export function fromDateInput(value: string, hour = 9): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return m ? romeToDate(+m[1], +m[2], +m[3], hour, 0) : null;
}

/** `YYYY-MM-DDTHH:mm` per `<input type="datetime-local">`. */
export function toDateTimeInput(d: Date | null): string {
  if (!d) {
    return '';
  }
  const p = romeParts(d);
  return `${p.y}-${pad(p.m)}-${pad(p.d)}T${pad(p.h)}:${pad(p.min)}`;
}

export function fromDateTimeInput(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  return m ? romeToDate(+m[1], +m[2], +m[3], +m[4], +m[5]) : null;
}
