import { RRule, type Options } from 'rrule';
import { romeParts, romeToDate } from './dates';

/** Codici RRULE dei giorni, indicizzati come `RomeParts.dow` (0 = domenica). */
export const BYDAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const;

/** Toglie l'eventuale prefisso `RRULE:` (le regole arrivano sia dal database sia dai feed ICS). */
export const stripRrulePrefix = (rrule: string): string => rrule.replace(/^RRULE:/, '');

const asLocalUtc = (d: Date) => {
  const p = romeParts(d);
  return new Date(Date.UTC(p.y, p.m - 1, p.d, p.h, p.min));
};
const fromLocalUtc = (d: Date) =>
  romeToDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes());

/** Regola valutata sull'ora «a muro» di Roma a partire da `startsAt`. */
function ruleFrom(startsAt: Date, rrule: string): RRule {
  const options: Partial<Options> = {
    ...RRule.parseString(stripRrulePrefix(rrule)),
    dtstart: asLocalUtc(startsAt),
  };
  return new RRule(options);
}

/**
 * Occorrenze di un impegno tra `from` e `to` (estremi inclusi).
 * La regola è valutata sull'ora "a muro" di Roma, così l'orario resta
 * costante attraverso il cambio ora legale/solare.
 * Senza rrule restituisce l'unica occorrenza se cade nell'intervallo.
 */
export function expandOccurrences(
  startsAt: Date,
  rrule: string | null | undefined,
  from: Date,
  to: Date,
): Date[] {
  if (!rrule) {
    return startsAt >= from && startsAt <= to ? [startsAt] : [];
  }
  return ruleFrom(startsAt, rrule).between(asLocalUtc(from), asLocalUtc(to), true).map(fromLocalUtc);
}

export function nextOccurrence(startsAt: Date, rrule: string | null | undefined, after: Date): Date | null {
  if (!rrule) {
    return startsAt > after ? startsAt : null;
  }
  const n = ruleFrom(startsAt, rrule).after(asLocalUtc(after), false);
  return n ? fromLocalUtc(n) : null;
}

const FREQ_LABEL: Record<string, [string, string]> = {
  DAILY: ['ogni giorno', 'ogni {n} giorni'],
  WEEKLY: ['ogni settimana', 'ogni {n} settimane'],
  MONTHLY: ['ogni mese', 'ogni {n} mesi'],
  YEARLY: ['ogni anno', 'ogni {n} anni'],
};

export function describeRrule(rrule: string | null | undefined): string {
  if (!rrule) {
    return 'Non si ripete';
  }
  const o = RRule.parseString(stripRrulePrefix(rrule));
  const key = Object.entries({
    DAILY: RRule.DAILY,
    WEEKLY: RRule.WEEKLY,
    MONTHLY: RRule.MONTHLY,
    YEARLY: RRule.YEARLY,
  }).find(([, v]) => v === o.freq)?.[0];
  if (!key) {
    return 'Ricorrente';
  }
  const n = o.interval ?? 1;
  return n === 1 ? FREQ_LABEL[key][0] : FREQ_LABEL[key][1].replace('{n}', String(n));
}

const DAY_SHORT: Record<string, string> = {
  MO: 'lun',
  TU: 'mar',
  WE: 'mer',
  TH: 'gio',
  FR: 'ven',
  SA: 'sab',
  SU: 'dom',
};

/** Etichette brevi per frequenza: [ogni volta, ogni N volte]. Le settimane hanno una regola a parte (giorni indicati). */
const SHORT_LABEL: Record<string, [string, (n: number) => string]> = {
  DAILY: ['ogni giorno', (n) => `ogni ${n} gg`],
  MONTHLY: ['ogni mese', (n) => `ogni ${n} mesi`],
  YEARLY: ['ogni anno', (n) => `ogni ${n} anni`],
};

/** «ogni gio», «ogni lun, mer e ven», «ogni 2 sett.». */
function weeklyShort(byDay: string | undefined, n: number): string {
  const days = (byDay ?? '')
    .split(',')
    .filter(Boolean)
    .map((d) => DAY_SHORT[d.replace(/[-+0-9]/g, '')])
    .filter(Boolean);
  if (days.length && n === 1) {
    return `ogni ${days.slice(0, -1).join(', ')}${days.length > 1 ? ' e ' : ''}${days[days.length - 1]}`;
  }
  return n === 1 ? 'ogni sett.' : `ogni ${n} sett.`;
}

/** Etichetta breve per le righe compatte: «ogni gio», «ogni 3 gg», «ogni mese». */
export function describeRruleShort(rrule: string | null | undefined): string {
  if (!rrule) {
    return '';
  }
  const parts = Object.fromEntries(
    stripRrulePrefix(rrule)
      .split(';')
      .map((x) => x.split('=') as [string, string]),
  );
  const n = Number(parts.INTERVAL ?? 1);
  if (parts.FREQ === 'WEEKLY') {
    return weeklyShort(parts.BYDAY, n);
  }
  const label = SHORT_LABEL[parts.FREQ];
  if (!label) {
    return 'ricorrente';
  }
  return n === 1 ? label[0] : label[1](n);
}
