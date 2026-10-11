import { ENTRY_TYPE_LABEL, formatEuro, romeToDate } from '@ohana/shared';
import type { CareReminderEvent, LinkedEvent } from './data';
import type { CareEntry, Maintenance, MaintenanceLog, ProcedureStep } from './types';

const TIME = new Intl.DateTimeFormat('it-IT', {
  timeZone: 'Europe/Rome',
  hour: '2-digit',
  minute: '2-digit',
});
const MORNING_HOUR = 9; // una data senza orario cade al mattino, così non scivola al giorno prima tra fusi

export interface TimelineChip {
  id: string;
  label: string;
  onOpen: () => void;
}

/** Una riga della linea del tempo, già pronta da mostrare: Cura, Manutenzioni e Pratiche la producono allo stesso modo. */
export interface TimelineRow {
  id: string;
  /** Istante della riga (ms); sceglie la data mostrata e l'ordine dei fatti già avvenuti. */
  at: number;
  /** Ancora da fare: pallino chiaro, in cima alla linea. */
  planned: boolean;
  /** Pallino pieno (evento rilevante, come una visita). */
  filled: boolean;
  /** Senza una data vera (es. passaggio di una pratica non ancora in calendario) la colonna della data resta vuota. */
  dated: boolean;
  /** Tra le righe in programma, dall'alto in basso per `order` decrescente. */
  order: number;
  type: string;
  title: string;
  href?: string;
  text?: string;
  chips: TimelineChip[];
}

/** In programma in cima (dal più lontano al più vicino), poi i fatti dal più recente: una sola linea, in ordine di tempo. */
export function sortTimeline(rows: TimelineRow[]): TimelineRow[] {
  const key = (r: TimelineRow) => (r.planned ? r.order : r.at);
  return [...rows].sort((a, b) => Number(b.planned) - Number(a.planned) || key(b) - key(a));
}

/** `YYYY-MM-DD` → istante delle 9:00 a Roma. */
function dayStart(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  return romeToDate(y, m, d, MORNING_HOUR).getTime();
}

const plannedLabel = (at: number) => `In programma · ${TIME.format(new Date(at))}`;

interface CareContext {
  authorName: (id: string) => string;
  openFile: (path: string) => void;
}

/** Filone di cura: tasselli registrati e impegni aperti. */
export function careRows(
  entries: CareEntry[],
  upcoming: CareReminderEvent[],
  ctx: CareContext,
): TimelineRow[] {
  // un impegno che ha già il suo tassello (visita chiusa) non si ripete
  const recorded = new Set(entries.map((e) => e.event_id).filter(Boolean));
  const planned: TimelineRow[] = upcoming
    .filter((e) => !recorded.has(e.id))
    .map((event) => {
      const at = Date.parse(event.starts_at);
      return {
        id: event.id,
        at,
        order: at,
        planned: true,
        filled: false,
        dated: true,
        type: plannedLabel(at),
        title: event.title,
        href: `/evento/${event.id}`,
        chips: [],
      };
    });
  const done: TimelineRow[] = entries.map((entry) => {
    const at = Date.parse(entry.entry_date + 'T09:00:00');
    const author =
      entry.type === 'visita' || entry.type === 'episodio' ? ctx.authorName(entry.author_id) : '';
    return {
      id: entry.id,
      at,
      order: at,
      planned: false,
      filled: entry.type === 'visita',
      dated: true,
      type: ENTRY_TYPE_LABEL[entry.type] + (author ? ` · ${author}` : ''),
      title: entry.title,
      text: entry.text ?? undefined,
      chips: entry.care_files.map((f) => ({
        id: f.id,
        label: `📎 ${f.name}`,
        onOpen: () => ctx.openFile(f.path),
      })),
    };
  });
  return sortTimeline([...planned, ...done]);
}

/** «Rossi · 120 €» — chi ha fatto l'intervento e quanto è costato; vuoto se non si sa nulla. */
function logSummary(entry: MaintenanceLog, contactName: string | undefined): string | undefined {
  const cost = entry.cost != null ? formatEuro(Number(entry.cost)).replace(',00', '') : null;
  const parts = [contactName, cost, entry.note].filter(Boolean);
  return parts.length ? parts.join(' · ') : undefined;
}

/** Impegno collegato a mano: in programma finché è aperto, poi tra i fatti come «Impegno svolto». */
function linkedRow(e: LinkedEvent): TimelineRow {
  const at = Date.parse(e.starts_at);
  const planned = e.status === 'open';
  return {
    id: e.id,
    at,
    order: at,
    planned,
    filled: false,
    dated: true,
    type: planned ? plannedLabel(at) : 'Impegno svolto',
    title: e.title,
    href: `/evento/${e.id}`,
    chips: [],
  };
}

/** Manutenzione (caldaia, auto…): interventi eseguiti dal registro, scadenze aperte e impegni collegati. */
export function maintenanceRows(
  m: Pick<Maintenance, 'id' | 'title' | 'events'>,
  log: MaintenanceLog[],
  contactName: (id: string) => string | undefined,
  linked: LinkedEvent[] = [],
): TimelineRow[] {
  const planned: TimelineRow[] = m.events
    .filter((e) => e.status === 'open')
    .map((e) => {
      const at = Date.parse(e.starts_at);
      return {
        id: e.id,
        at,
        order: at,
        planned: true,
        filled: false,
        dated: true,
        type: plannedLabel(at),
        title: m.title,
        href: `/evento/${e.id}`,
        chips: [],
      };
    });
  const done: TimelineRow[] = log.map((entry) => {
    const at = dayStart(entry.done_on);
    return {
      id: entry.id,
      at,
      order: at,
      planned: false,
      filled: true,
      dated: true,
      type: 'Eseguita',
      title: m.title,
      text: logSummary(entry, entry.contact_id ? contactName(entry.contact_id) : undefined),
      chips: [],
    };
  });
  return sortTimeline([...planned, ...done, ...linked.map(linkedRow)]);
}

/** Cosa sa la riga di un passaggio oltre al titolo: ditta e chip degli allegati. */
export interface StepDetails {
  contactName?: (id: string) => string | undefined;
  chipsOf?: (stepId: string) => TimelineChip[];
}

/** «Nota · Clima Sud · 2.850 €» — le parti presenti di un passaggio a fasi. */
function stepText(s: ProcedureStep, contactName?: (id: string) => string | undefined): string | undefined {
  const parts = [
    s.note,
    s.contact_id ? contactName?.(s.contact_id) : undefined,
    s.amount != null ? formatEuro(Number(s.amount)).replace(',00', '') : undefined,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : undefined;
}

/**
 * Pratica: passaggi chiusi con la loro data e passaggi aperti. Un passaggio aperto segue la posizione nell'iter
 * (il primo da fare sta subito sopra l'ultimo fatto); mostra una data solo se è già nel calendario.
 */
export function procedureRows(
  steps: ProcedureStep[],
  eventDates: Map<string, string>,
  linked: LinkedEvent[] = [],
  details: StepDetails = {},
): TimelineRow[] {
  // l'impegno di un passaggio è già nella riga del passaggio: non si ripete
  const ofSteps = new Set(steps.map((s) => s.event_id).filter(Boolean));
  const extra = linked.filter((e) => !ofSteps.has(e.id)).map(linkedRow);
  return sortTimeline([
    ...extra,
    ...steps.map((s) => {
      const startsAt = s.event_id ? eventDates.get(s.event_id) : undefined;
      const at = s.done_at ? Date.parse(s.done_at) : startsAt ? Date.parse(startsAt) : 0;
      return {
        id: s.id,
        at,
        order: s.position,
        planned: !s.done_at,
        filled: !!s.done_at,
        dated: !!s.done_at || !!startsAt,
        type: s.done_at ? 'Completato' : startsAt ? plannedLabel(at) : 'Da fare',
        title: s.title,
        text: stepText(s, details.contactName),
        href: !s.done_at && s.event_id ? `/evento/${s.event_id}` : undefined,
        chips: details.chipsOf?.(s.id) ?? [],
      };
    }),
  ]);
}
