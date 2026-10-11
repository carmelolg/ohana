import { DAY_MS, isoDayRome, romeParts } from '@ohana/shared';

export interface IcsEvent {
  kind?: 'appuntamento' | 'faccenda';
  /** Calendario da cui l'impegno è stato importato: non si riesporta, o tornerebbe duplicato nel calendario d'origine. */
  import_id?: string | null;
  /** Impegno di Cura (visita, ricetta…): esce dall'app solo come «occupato», senza titolo né note. */
  private?: boolean;
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  location: string | null;
  notes: string | null;
  rrule: string | null;
  status: 'open' | 'done';
  space_name: string;
  event_reminders: { offset_minutes: number }[];
}

/** Testo ICS (RFC 5545 §3.3.11): barra, punto e virgola, virgola e a capo vanno protetti. `escapeHtml` non c'entra. */
export const escapeIcsText = (s: string) =>
  s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const esc = escapeIcsText;
const utc = (iso: string) =>
  new Date(iso)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');

/** Piega le righe a 75 ottetti come da RFC 5545 §3.1. */
export function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) {
    return line;
  }
  const out: string[] = [];
  let cur = '';
  let curLen = 0;
  let limit = 75;
  for (const ch of line) {
    const l = new TextEncoder().encode(ch).length;
    if (curLen + l > limit) {
      out.push(cur);
      cur = ch;
      curLen = l;
      limit = 74; // la riga di continuazione inizia con uno spazio
    } else {
      cur += ch;
      curLen += l;
    }
  }
  out.push(cur);
  return out.join('\r\n ');
}

const PRIVATE_TITLE = 'Impegno di cura';
const PAST_WINDOW_DAYS = 90;

/** Impegni che entrano nel feed: niente faccende, niente impegni importati, solo ricorrenti o recenti. */
export function selectFeedEvents<T extends IcsEvent>(rows: T[], nowMs: number): T[] {
  const since = nowMs - PAST_WINDOW_DAYS * DAY_MS;
  return rows
    .filter((e) => e.kind !== 'faccenda')
    .filter((e) => !e.import_id)
    .filter((e) => e.rrule || new Date(e.starts_at).getTime() > since);
}

const pad = (n: number) => String(n).padStart(2, '0');
/** Ora «a muro» di Roma come `YYYYMMDDTHHMMSS`, per `DTSTART;TZID=Europe/Rome`. */
function romeLocal(d: Date): string {
  const p = romeParts(d);
  return `${p.y}${pad(p.m)}${pad(p.d)}T${pad(p.h)}${pad(p.min)}00`;
}

/**
 * Fuso di Roma per i client che non lo conoscono. Serve alle ricorrenze: con l'orario fissato in UTC, «ogni lunedì alle 10»
 * slitterebbe di un'ora a ogni cambio tra ora solare e legale.
 */
const ROME_TIMEZONE = [
  'BEGIN:VTIMEZONE',
  'TZID:Europe/Rome',
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:+0100',
  'TZOFFSETTO:+0200',
  'TZNAME:CEST',
  'DTSTART:19700329T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0100',
  'TZNAME:CET',
  'DTSTART:19701025T030000',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
];

const needsRomeTime = (e: IcsEvent) => !!e.rrule && !e.all_day;

function whenLines(e: IcsEvent, start: Date, end: Date): string[] {
  if (e.all_day) {
    // il giorno è quello di Roma: l'UTC di una mezzanotte romana cade il giorno prima
    return [`DTSTART;VALUE=DATE:${isoDayRome(start).replace(/-/g, '')}`];
  }
  if (needsRomeTime(e)) {
    return [`DTSTART;TZID=Europe/Rome:${romeLocal(start)}`, `DTEND;TZID=Europe/Rome:${romeLocal(end)}`];
  }
  return [`DTSTART:${utc(start.toISOString())}`, `DTEND:${utc(end.toISOString())}`];
}

function eventLines(e: IcsEvent, now: Date): string[] {
  const start = new Date(e.starts_at);
  const end = e.ends_at ? new Date(e.ends_at) : new Date(start.getTime() + 3600000);
  const title = e.private ? PRIVATE_TITLE : e.title;
  const lines = ['BEGIN:VEVENT', `UID:${e.id}@ohana`, `DTSTAMP:${utc(now.toISOString())}`];
  lines.push(...whenLines(e, start, end), `SUMMARY:${esc(title)}`);
  if (e.location && !e.private) {
    lines.push(`LOCATION:${esc(e.location)}`);
  }
  const desc = e.private ? '' : [e.space_name, e.notes].filter(Boolean).join(' · ');
  if (desc) {
    lines.push(`DESCRIPTION:${esc(desc)}`);
  }
  if (e.rrule) {
    lines.push(`RRULE:${e.rrule.replace(/^RRULE:/, '')}`);
  }
  if (e.status === 'done') {
    lines.push('STATUS:CANCELLED');
  }
  for (const r of e.event_reminders) {
    lines.push(
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${esc(title)}`,
      `TRIGGER:-PT${r.offset_minutes}M`,
      'END:VALARM',
    );
  }
  lines.push('END:VEVENT');
  return lines;
}

export function buildIcs(events: IcsEvent[], calName: string, now = new Date()): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ohana//IT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(calName)}`,
    'X-WR-TIMEZONE:Europe/Rome',
    // suggerimento ai client che lo rispettano (Apple); Google decide da sé, ogni 8-24 ore
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
  ];
  if (events.some(needsRomeTime)) {
    lines.push(...ROME_TIMEZONE);
  }
  for (const e of events) {
    lines.push(...eventLines(e, now));
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
