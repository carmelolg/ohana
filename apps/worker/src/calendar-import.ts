import { DAY_MS, expandOccurrences, MINUTE_MS, startOfDayRome } from '@ohana/shared';
import type { ParsedEvent } from './ics-parse';

/** Quanto indietro e avanti si importano gli impegni; fuori da questa finestra non si tocca nulla. */
export const PAST_DAYS = 30;
export const FUTURE_DAYS = 365;
/** Oltre questo numero si tengono i più vicini: un calendario enorme non deve gonfiare il database. */
export const MAX_IMPORTED = 3000;
/**
 * Ogni calendario si rilegge a ogni giro di cron (5 minuti). La soglia è un po' sotto, non uguale: il cron parte con qualche
 * secondo di scarto e con 5 minuti esatti un giro su due salterebbe il calendario.
 */
export const SYNC_EVERY_MS = 4 * MINUTE_MS;

const MAX_TITLE = 200;
const MAX_LOCATION = 300;
const MAX_NOTES = 2000;

/** Un impegno pronto da scrivere in `events`. */
export interface ImportedEvent {
  external_id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  location: string | null;
  notes: string | null;
}

export interface ImportWindow {
  from: Date;
  to: Date;
}

export function importWindow(now: Date): ImportWindow {
  return {
    from: startOfDayRome(new Date(now.getTime() - PAST_DAYS * DAY_MS)),
    to: new Date(now.getTime() + FUTURE_DAYS * DAY_MS),
  };
}

/** `20271101T090000Z`: l'istante di un'occorrenza, stabile e leggibile, per riconoscerla alla sincronizzazione dopo. */
const stamp = (d: Date): string =>
  d
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');

const clip = (s: string | null, max: number): string | null => (s?.trim() ? s.trim().slice(0, max) : null);

function toImported(e: ParsedEvent, externalId: string, start: Date, end: Date | null): ImportedEvent {
  return {
    external_id: externalId,
    title: clip(e.summary, MAX_TITLE) ?? 'Senza titolo',
    starts_at: start.toISOString(),
    // per un giorno intero la fine di ICS è il giorno dopo (estremo escluso): l'app non la usa
    ends_at: end && !e.allDay ? end.toISOString() : null,
    all_day: e.allDay,
    location: clip(e.location, MAX_LOCATION),
    notes: clip(e.description, MAX_NOTES),
  };
}

/**
 * Occorrenze di una ricorrenza nella finestra. La regola è valutata sull'ora di Roma (`expandOccurrences`), come per gli
 * impegni dell'app; si saltano le date escluse (EXDATE) e quelle che hanno una versione modificata.
 */
function seriesOccurrences(master: ParsedEvent, skipped: Set<string>, win: ImportWindow): ImportedEvent[] {
  const duration = master.end ? master.end.getTime() - master.start.getTime() : null;
  const excluded = new Set([...skipped, ...master.exdates.map(stamp)]);
  return expandOccurrences(master.start, master.rrule, win.from, win.to)
    .filter((at) => !excluded.has(stamp(at)))
    .map((at) =>
      toImported(
        master,
        `${master.uid}@${stamp(at)}`,
        at,
        duration === null ? null : new Date(at.getTime() + duration),
      ),
    );
}

const inWindow = (d: Date, win: ImportWindow) => d >= win.from && d <= win.to;

function eventsOfUid(group: ParsedEvent[], win: ImportWindow): ImportedEvent[] {
  const master = group.find((e) => !e.recurrenceId);
  const overrides = group.filter((e) => e.recurrenceId);
  const out: ImportedEvent[] = [];
  // una versione modificata prende l'identificatore dell'occorrenza che sostituisce: la sincronizzazione la aggiorna sul posto
  const overridden = new Set(overrides.map((o) => stamp(o.recurrenceId!)));
  for (const o of overrides) {
    if (!o.cancelled && inWindow(o.start, win)) {
      out.push(toImported(o, `${o.uid}@${stamp(o.recurrenceId!)}`, o.start, o.end));
    }
  }
  if (!master || master.cancelled) {
    return out;
  }
  if (master.rrule) {
    return [...out, ...seriesOccurrences(master, overridden, win)];
  }
  return inWindow(master.start, win)
    ? [...out, toImported(master, master.uid, master.start, master.end)]
    : out;
}

/** Gli impegni da avere in app: ricorrenze espanse in occorrenze, annullati esclusi, solo nella finestra. */
export function importedEvents(parsed: ParsedEvent[], win: ImportWindow): ImportedEvent[] {
  const byUid = new Map<string, ParsedEvent[]>();
  for (const e of parsed) {
    byUid.set(e.uid, [...(byUid.get(e.uid) ?? []), e]);
  }
  return [...byUid.values()]
    .flatMap((group) => eventsOfUid(group, win))
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    .slice(0, MAX_IMPORTED);
}

/** Un impegno già importato, com'è nel database. */
export interface StoredImport extends ImportedEvent {
  id: string;
}

export interface SyncPlan {
  /** Nuovi o cambiati: gli altri non si riscrivono. */
  upserts: ImportedEvent[];
  /** Spariti dal calendario d'origine (cancellati o annullati). */
  removeIds: string[];
}

const sameInstant = (a: string | null, b: string | null) =>
  (a === null ? null : new Date(a).getTime()) === (b === null ? null : new Date(b).getTime());

const isUnchanged = (a: ImportedEvent, b: ImportedEvent) =>
  a.title === b.title &&
  a.all_day === b.all_day &&
  a.location === b.location &&
  a.notes === b.notes &&
  sameInstant(a.starts_at, b.starts_at) &&
  sameInstant(a.ends_at, b.ends_at);

/**
 * Cosa scrivere per allineare l'app al calendario. Si tolgono solo gli impegni dentro la finestra: ciò che è più vecchio
 * non è più nel file ma resta come storia.
 */
export function planSync(stored: StoredImport[], incoming: ImportedEvent[], win: ImportWindow): SyncPlan {
  const byId = new Map(stored.map((s) => [s.external_id, s]));
  const present = new Set(incoming.map((i) => i.external_id));
  return {
    upserts: incoming.filter((i) => {
      const old = byId.get(i.external_id);
      return !old || !isUnchanged(old, i);
    }),
    removeIds: stored
      .filter((s) => !present.has(s.external_id) && new Date(s.starts_at) >= win.from)
      .map((s) => s.id),
  };
}

/** È ora di sincronizzare: mai fatto, oppure è passato un giro di cron dall'ultima volta (anche se fallita: non si martella un calendario rotto). */
export function importIsDue(imp: { last_synced_at: string | null }, now: Date): boolean {
  return !imp.last_synced_at || now.getTime() - new Date(imp.last_synced_at).getTime() >= SYNC_EVERY_MS;
}
