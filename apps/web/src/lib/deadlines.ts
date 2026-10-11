import type { DocumentRow, Maintenance, Occurrence, Procedure } from './types';

export type DeadlineKind = 'scadenza' | 'documento' | 'manutenzione' | 'pratica';

export interface Deadline {
  id: string;
  kind: DeadlineKind;
  title: string;
  at: Date;
  sub: string;
  href: string;
  /** Solo le scadenze-impegno si segnano «pagate» da qui; le altre si chiudono nella loro funzione. */
  eventId?: string;
}

interface Sources {
  occurrences: Occurrence[];
  documents: DocumentRow[];
  maintenances: Pick<Maintenance, 'id' | 'title' | 'space_id' | 'events'>[];
  procedures: Procedure[];
}

const DOC_NOON = 'T12:00:00';

type Collector = (src: Sources, inScope: (spaceId: string) => boolean) => Deadline[];

const fromEvents: Collector = ({ occurrences }, inScope) =>
  occurrences
    .filter((o) => o.event.categories?.slug === 'scadenza' && o.event.status === 'open')
    .filter((o) => inScope(o.event.space_id))
    .map((o) => ({
      id: o.key,
      kind: 'scadenza',
      title: o.event.title,
      at: o.at,
      sub: 'Scadenza',
      href: `/evento/${o.event.id}`,
      eventId: o.event.id,
    }));

const fromDocuments: Collector = ({ documents }, inScope) =>
  documents
    .filter((d) => d.expires_at && inScope(d.space_id))
    .map((d) => ({
      id: 'doc-' + d.id,
      kind: 'documento',
      title: d.title,
      at: new Date(d.expires_at + DOC_NOON),
      sub: 'Documento in scadenza',
      href: '/documenti',
    }));

const fromMaintenances: Collector = ({ maintenances }, inScope) =>
  maintenances.flatMap((m) => {
    const next = m.events.find((e) => e.status === 'open');
    return next && inScope(m.space_id)
      ? [
          {
            id: 'man-' + m.id,
            kind: 'manutenzione' as const,
            title: m.title,
            at: new Date(next.starts_at),
            sub: 'Manutenzione',
            href: '/manutenzioni',
          },
        ]
      : [];
  });

const fromProcedures: Collector = ({ procedures }, inScope) =>
  procedures
    .filter((p) => p.due_date && p.status === 'in_corso' && inScope(p.space_id))
    .map((p) => ({
      id: 'pra-' + p.id,
      kind: 'pratica',
      title: p.title,
      at: new Date(p.due_date + DOC_NOON),
      sub: 'Pratica',
      href: `/pratiche/${p.id}`,
    }));

const COLLECTORS: Collector[] = [fromEvents, fromDocuments, fromMaintenances, fromProcedures];

/**
 * Raccoglie ciò che scade, da fonti già esistenti (impegni «Scadenza», documenti, manutenzioni, pratiche):
 * nessun dato nuovo, solo una vista unica in ordine di data. `inScope` filtra per spazio.
 */
export function collectDeadlines(
  src: Sources,
  inScope: (spaceId: string) => boolean,
  from: Date,
): Deadline[] {
  return COLLECTORS.flatMap((collect) => collect(src, inScope))
    .filter((d) => d.at >= from)
    .sort((a, b) => +a.at - +b.at);
}

const MONTH = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', month: 'long', year: 'numeric' });

/** Raggruppa per mese («ottobre 2026»), mantenendo l'ordine di data. */
export function groupByMonth(list: Deadline[]): [string, Deadline[]][] {
  const groups = new Map<string, Deadline[]>();
  for (const d of list) {
    const key = MONTH.format(d.at);
    groups.set(key, [...(groups.get(key) ?? []), d]);
  }
  return [...groups];
}
