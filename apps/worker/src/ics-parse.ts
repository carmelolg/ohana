import { romeToDate } from '@ohana/shared';

/** Un VEVENT letto da un file ICS, già con le date convertite in istanti. */
export interface ParsedEvent {
  uid: string;
  /** Presente solo nelle occorrenze modificate di una ricorrenza: l'istante originale dell'occorrenza. */
  recurrenceId: Date | null;
  summary: string;
  description: string | null;
  location: string | null;
  start: Date;
  end: Date | null;
  allDay: boolean;
  rrule: string | null;
  exdates: Date[];
  cancelled: boolean;
}

interface Line {
  name: string;
  params: Record<string, string>;
  value: string;
}

/** Righe piegate (RFC 5545 §3.1): una riga che inizia con spazio o tabulazione continua la precedente. */
const unfold = (text: string): string[] => text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);

/** «NOME;PARAM=valore;ALTRO="a:b":contenuto»: i due punti dentro le virgolette dei parametri non separano. */
function parseLine(raw: string): Line | null {
  let quoted = false;
  let colon = -1;
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === '"') {
      quoted = !quoted;
    } else if (raw[i] === ':' && !quoted) {
      colon = i;
      break;
    }
  }
  if (colon < 0) {
    return null;
  }
  const [name, ...rawParams] = raw.slice(0, colon).split(/;(?=(?:[^"]*"[^"]*")*[^"]*$)/);
  const params: Record<string, string> = {};
  for (const p of rawParams) {
    const eq = p.indexOf('=');
    if (eq > 0) {
      params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1).replace(/^"|"$/g, '');
    }
  }
  return { name: name.toUpperCase(), params, value: raw.slice(colon + 1) };
}

const unescapeText = (s: string): string =>
  s.replace(/\\([nN,;\\])/g, (_m, c: string) => (c === 'n' || c === 'N' ? '\n' : c));

/** Istante dell'ora «a muro» `y-m-d h:min` nel fuso `tz`; un fuso sconosciuto (nomi di Windows…) vale Roma. */
export function wallToInstant(y: number, m: number, d: number, h: number, min: number, tz: string): Date {
  let fmt: Intl.DateTimeFormat;
  try {
    fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    });
  } catch {
    return romeToDate(y, m, d, h, min); // fuso non riconosciuto: l'app ragiona in Europe/Rome
  }
  const wall = Date.UTC(y, m - 1, d, h, min);
  let guess = wall;
  for (let i = 0; i < 3; i++) {
    const p = Object.fromEntries(fmt.formatToParts(new Date(guess)).map((x) => [x.type, Number(x.value)]));
    guess += wall - Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  }
  return new Date(guess);
}

const DATE_VALUE = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/;

/** Data o data-ora ICS. Una data senza orario è «tutto il giorno» e vale la mezzanotte di Roma, come nell'app. */
export function parseIcsDate(
  value: string,
  params: Record<string, string> = {},
): { date: Date; allDay: boolean } | null {
  const m = DATE_VALUE.exec(value.trim());
  if (!m) {
    return null;
  }
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (m[4] === undefined || params.VALUE === 'DATE') {
    return { date: romeToDate(y, mo, d), allDay: true };
  }
  const [h, min] = [Number(m[4]), Number(m[5])];
  if (m[7]) {
    return { date: new Date(Date.UTC(y, mo - 1, d, h, min, Number(m[6] ?? 0))), allDay: false };
  }
  return { date: wallToInstant(y, mo, d, h, min, params.TZID ?? 'Europe/Rome'), allDay: false };
}

const DURATION = /^(-)?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/;
const SECOND_MS = 1000;
const UNIT_SECONDS = [7 * 86400, 86400, 3600, 60, 1];

/** Durata ICS (`PT1H30M`, `P1D`) in millisecondi; null se non è una durata. */
export function parseIcsDuration(value: string): number | null {
  const m = DURATION.exec(value.trim());
  if (!m) {
    return null;
  }
  const seconds = UNIT_SECONDS.reduce((sum, unit, i) => sum + unit * Number(m[i + 2] ?? 0), 0);
  return (m[1] ? -1 : 1) * seconds * SECOND_MS;
}

interface Draft {
  lines: Line[];
}

function firstValue(d: Draft, name: string): Line | undefined {
  return d.lines.find((l) => l.name === name);
}

function textOf(d: Draft, name: string): string | null {
  const v = firstValue(d, name)?.value;
  return v ? unescapeText(v) : null;
}

function exdatesOf(d: Draft): Date[] {
  return d.lines
    .filter((l) => l.name === 'EXDATE')
    .flatMap((l) => l.value.split(',').map((v) => parseIcsDate(v, l.params)?.date))
    .filter((x): x is Date => !!x);
}

function endOf(d: Draft, start: Date, allDay: boolean): Date | null {
  const dtend = firstValue(d, 'DTEND');
  const parsed = dtend ? parseIcsDate(dtend.value, dtend.params) : null;
  if (parsed) {
    return parsed.date;
  }
  const duration = parseIcsDuration(firstValue(d, 'DURATION')?.value ?? '');
  return duration && !allDay ? new Date(start.getTime() + duration) : null;
}

/** Un VEVENT senza UID o senza inizio non si può sincronizzare in modo ripetibile: viene ignorato. */
function toEvent(d: Draft): ParsedEvent | null {
  const uid = firstValue(d, 'UID')?.value.trim();
  const dtstart = firstValue(d, 'DTSTART');
  const start = dtstart ? parseIcsDate(dtstart.value, dtstart.params) : null;
  if (!uid || !start) {
    return null;
  }
  const recurrence = firstValue(d, 'RECURRENCE-ID');
  return {
    uid,
    recurrenceId: recurrence ? (parseIcsDate(recurrence.value, recurrence.params)?.date ?? null) : null,
    summary: textOf(d, 'SUMMARY') ?? '',
    description: textOf(d, 'DESCRIPTION'),
    location: textOf(d, 'LOCATION'),
    start: start.date,
    end: endOf(d, start.date, start.allDay),
    allDay: start.allDay,
    rrule: firstValue(d, 'RRULE')?.value.replace(/^RRULE:/, '') ?? null,
    exdates: exdatesOf(d),
    cancelled: firstValue(d, 'STATUS')?.value.trim().toUpperCase() === 'CANCELLED',
  };
}

interface ReadState {
  draft: Draft | null;
  /** Dentro un VALARM: le sue righe (DESCRIPTION, TRIGGER…) non appartengono all'impegno. */
  alarmDepth: number;
  events: ParsedEvent[];
}

/** Gestisce le righe BEGIN/END e dice se l'ha consumata. Lo stato è locale alla lettura di un file. */
function consume(state: ReadState, line: Line): boolean {
  const isEvent = line.value === 'VEVENT';
  const isAlarm = line.value === 'VALARM';
  if (line.name === 'BEGIN' && isEvent) {
    state.draft = { lines: [] };
  } else if (line.name === 'END' && isEvent) {
    const event = state.draft ? toEvent(state.draft) : null;
    if (event) {
      state.events.push(event);
    }
    state.draft = null;
  } else if (line.name === 'BEGIN' && isAlarm) {
    state.alarmDepth++;
  } else if (line.name === 'END' && isAlarm) {
    state.alarmDepth = Math.max(0, state.alarmDepth - 1);
  } else {
    return false;
  }
  return true;
}

/** Legge i VEVENT di un file ICS. Gli allarmi (VALARM) e tutto ciò che non è un impegno vengono saltati. */
export function parseIcs(text: string): ParsedEvent[] {
  const state: ReadState = { draft: null, alarmDepth: 0, events: [] };
  for (const raw of unfold(text)) {
    const line = parseLine(raw);
    if (line && !consume(state, line) && state.draft && state.alarmDepth === 0) {
      state.draft.lines.push(line);
    }
  }
  return state.events;
}
