import { ENTRY_TYPE_LABEL, formatEuro, formatReading, readingInfo, romeToDate } from '@ohana/shared';
import type { CareReminderEvent, LinkedEvent } from './data';
import type { CareEntry, Maintenance, MaintenanceLog, ProcedureStep } from './types';

const TIME = new Intl.DateTimeFormat('it-IT', {
  timeZone: 'Europe/Rome',
  hour: '2-digit',
  minute: '2-digit',
});
const DUE_DAY = new Intl.DateTimeFormat('it-IT', {
  timeZone: 'Europe/Rome',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const MORNING_HOUR = 9; // una data senza orario cade al mattino, così non scivola al giorno prima tra fusi

export interface TimelineChip {
  id: string;
  label: string;
  /** Apre il file: la chiamata si attende, così il pulsante può mostrare che sta lavorando. */
  onOpen: () => Promise<unknown>;
}

/** Azione sulla riga (es. «Allega referto»): un pulsante accanto ai chip dei file. */
export interface TimelineAction {
  label: string;
  ariaLabel: string;
  onClick: () => void;
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
  /** Valori misurati e prossimi passi del tassello, una riga ciascuno: si leggono senza aprire la visita. */
  facts?: string[];
  chips: TimelineChip[];
  action?: TimelineAction;
  /** Elimina la riga (un tassello): un pulsante a parte, per chi può farlo. */
  remove?: TimelineAction;
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

/** Azioni per chi può scrivere (allegare un referto, eliminare un tassello); senza, le righe restano di sola lettura. */
export interface CareActions {
  entry: (entry: CareEntry) => TimelineAction;
  event: (event: CareReminderEvent) => TimelineAction;
  /** `undefined` quando questo utente non può eliminare quel tassello. */
  removeEntry?: (entry: CareEntry) => TimelineAction | undefined;
}

interface CareContext {
  authorName: (id: string) => string;
  openFile: (path: string) => Promise<unknown>;
  /** Allegati degli impegni: stanno nel bucket generico, non in quello della Cura. */
  openAttachment: (path: string) => Promise<unknown>;
  actions?: CareActions;
}

/** Impegno del filone: in programma se è aperto, tra i fatti come «Impegno svolto» quando è segnato fatto. */
function careEventRow(event: CareReminderEvent, ctx: CareContext): TimelineRow {
  const at = Date.parse(event.starts_at);
  const planned = event.status === 'open';
  return {
    id: event.id,
    at,
    order: at,
    planned,
    filled: false,
    dated: true,
    type: planned ? plannedLabel(at) : 'Impegno svolto',
    title: event.title,
    href: `/evento/${event.id}`,
    chips: event.attachments.map((a) => ({
      id: a.id,
      label: `📎 ${a.name}`,
      onOpen: () => ctx.openAttachment(a.path),
    })),
    action: ctx.actions?.event(event),
  };
}

/** Valori del referto e prossimi passi, in forma leggibile («PCR: 23 mg/dL», «Prossimo controllo · 13 gen 2027»). */
function entryFacts(entry: CareEntry): string[] {
  const readings = Object.entries(entry.readings).map(
    ([key, value]) => `${readingInfo(key).label}: ${formatReading(key, value)}`,
  );
  const followUps = entry.follow_ups.map((f) => {
    const due = f.due_date ? DUE_DAY.format(new Date(f.due_date + 'T09:00:00')) : f.due_hint;
    return due ? `${f.title} · ${due}` : f.title;
  });
  return [...readings, ...followUps];
}

/** Filone di cura: tasselli registrati e impegni (in programma o svolti). */
export function careRows(entries: CareEntry[], events: CareReminderEvent[], ctx: CareContext): TimelineRow[] {
  // un impegno che ha già il suo tassello (visita chiusa con l'esito) non si ripete
  const recorded = new Set(entries.map((e) => e.event_id).filter(Boolean));
  const planned: TimelineRow[] = events
    .filter((e) => !recorded.has(e.id))
    .map((event) => careEventRow(event, ctx));
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
      facts: entryFacts(entry),
      chips: entry.care_files.map((f) => ({
        id: f.id,
        label: `📎 ${f.name}`,
        onOpen: () => ctx.openFile(f.path),
      })),
      action: ctx.actions?.entry(entry),
      remove: ctx.actions?.removeEntry?.(entry),
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
  return sortTimeline([...planned, ...done, ...linked.map((e) => linkedRow(e))]);
}

/** Cosa sa la riga di un passaggio oltre al titolo: la ditta. Gli allegati non stanno in cronologia: si vedono in Documenti e sull'impegno. */
export interface StepDetails {
  contactName?: (id: string) => string | undefined;
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
        chips: [],
      };
    }),
  ]);
}
