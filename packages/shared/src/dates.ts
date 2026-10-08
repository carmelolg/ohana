export const TZ = 'Europe/Rome';

export const MINUTE_MS = 60_000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

export const MONTHS_IT = [
  'gennaio',
  'febbraio',
  'marzo',
  'aprile',
  'maggio',
  'giugno',
  'luglio',
  'agosto',
  'settembre',
  'ottobre',
  'novembre',
  'dicembre',
] as const;
/** Indicizzati come `RomeParts.dow` (0 = domenica). */
export const WEEKDAYS_IT = [
  'domenica',
  'lunedì',
  'martedì',
  'mercoledì',
  'giovedì',
  'venerdì',
  'sabato',
] as const;

const pad2 = (n: number) => String(n).padStart(2, '0');

export interface RomeParts {
  y: number;
  m: number; // 1-12
  d: number;
  h: number;
  min: number;
  dow: number; // 0 = domenica
}

const partsFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export function romeParts(date: Date): RomeParts {
  const o: Record<string, number> = {};
  for (const p of partsFmt.formatToParts(date)) {
    if (p.type !== 'literal') {
      o[p.type] = Number(p.value);
    }
  }
  const dow = new Date(Date.UTC(o.year, o.month - 1, o.day)).getUTCDay();
  return { y: o.year, m: o.month, d: o.day, h: o.hour, min: o.minute, dow };
}

/** Istante UTC corrispondente all'ora "a muro" di Roma. */
export function romeToDate(y: number, m: number, d: number, h = 0, min = 0): Date {
  const wall = Date.UTC(y, m - 1, d, h, min);
  let guess = wall;
  for (let i = 0; i < 3; i++) {
    const p = romeParts(new Date(guess));
    const seen = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min);
    guess += wall - seen;
  }
  return new Date(guess);
}

export function addDaysRome(date: Date, n: number): Date {
  const p = romeParts(date);
  return romeToDate(p.y, p.m, p.d + n, p.h, p.min);
}

export function startOfDayRome(date: Date): Date {
  const p = romeParts(date);
  return romeToDate(p.y, p.m, p.d);
}

/** Giorno di calendario a Roma come `YYYY-MM-DD` (chiave stabile per log e campi `date`). */
export function isoDayRome(date: Date): string {
  const p = romeParts(date);
  return `${p.y}-${pad2(p.m)}-${pad2(p.d)}`;
}

/** Minuti trascorsi dalla mezzanotte, ora di Roma. */
export function minutesOfDayRome(date: Date): number {
  const p = romeParts(date);
  return p.h * 60 + p.min;
}

export function sameDayRome(a: Date, b: Date): boolean {
  const x = romeParts(a);
  const y = romeParts(b);
  return x.y === y.y && x.m === y.m && x.d === y.d;
}

/** Differenza in giorni di calendario (b - a) nel fuso di Roma. */
export function dayDiffRome(a: Date, b: Date): number {
  const x = romeParts(a);
  const y = romeParts(b);
  return Math.round((Date.UTC(y.y, y.m - 1, y.d) - Date.UTC(x.y, x.m - 1, x.d)) / DAY_MS);
}

const dayFmt = new Intl.DateTimeFormat('it-IT', {
  timeZone: TZ,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});
const dayShortFmt = new Intl.DateTimeFormat('it-IT', {
  timeZone: TZ,
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});
const timeFmt = new Intl.DateTimeFormat('it-IT', {
  timeZone: TZ,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
const fullFmt = new Intl.DateTimeFormat('it-IT', {
  timeZone: TZ,
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const numericDayFmt = new Intl.DateTimeFormat('it-IT', { timeZone: TZ });
const eur = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });

export const formatDay = (d: Date) => dayFmt.format(d);
export const formatDayShort = (d: Date) => dayShortFmt.format(d);
export const formatTime = (d: Date) => timeFmt.format(d);
export const formatDate = (d: Date) => fullFmt.format(d);
/** «08/10/2026» */
export const formatNumericDate = (d: Date) => numericDayFmt.format(d);
export const formatEuro = (n: number) => eur.format(n);

export function relativeDayLabel(date: Date, now: Date): string {
  const diff = dayDiffRome(now, date);
  if (diff === 0) {
    return 'Oggi';
  }
  if (diff === 1) {
    return 'Domani';
  }
  if (diff === -1) {
    return 'Ieri';
  }
  if (diff > 1 && diff < 7) {
    return new Intl.DateTimeFormat('it-IT', { timeZone: TZ, weekday: 'long' }).format(date);
  }
  return formatDayShort(date);
}
