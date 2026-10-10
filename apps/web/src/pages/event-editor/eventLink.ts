import type { EventRow } from '../../lib/types';

export type LinkKind = 'procedure' | 'maintenance';
export interface EventLink {
  kind: LinkKind;
  id: string;
}

/** Il collegamento sta in un solo campo di testo («procedure:<id>», vuoto = nessuno): è ciò che sceglie il menu. */
export const linkKey = (link: EventLink | null): string => (link ? `${link.kind}:${link.id}` : '');

export function parseLinkKey(key: string): EventLink | null {
  const [kind, id] = key.split(':');
  return id && (kind === 'procedure' || kind === 'maintenance') ? { kind, id } : null;
}

export const linkKeyOfEvent = (e: Pick<EventRow, 'linked_procedure_id' | 'linked_maintenance_id'>): string =>
  e.linked_procedure_id
    ? linkKey({ kind: 'procedure', id: e.linked_procedure_id })
    : e.linked_maintenance_id
      ? linkKey({ kind: 'maintenance', id: e.linked_maintenance_id })
      : '';

/** Colonne di `events` da scrivere: il database ne ammette una sola valorizzata. */
export function linkColumns(key: string) {
  const link = parseLinkKey(key);
  return {
    linked_procedure_id: link?.kind === 'procedure' ? link.id : null,
    linked_maintenance_id: link?.kind === 'maintenance' ? link.id : null,
  };
}

interface SectionInput {
  isChore: boolean;
  /** Slug della categoria scelta (`visita`, `scadenza`…); vuoto finché non è nota. */
  categorySlug: string | null | undefined;
  careThreadId: string;
  linkKey: string;
}

/**
 * Quali sezioni di collegamento mostra l'editor: una visita va nella Cura, ogni altro impegno si può legare a una pratica
 * o a una manutenzione. Un collegamento già scelto resta visibile anche se la categoria cambia, così non si perde in silenzio.
 */
export function eventSections(i: SectionInput): { care: boolean; link: boolean } {
  if (i.isChore) {
    return { care: false, link: false };
  }
  const isVisit = i.categorySlug === 'visita';
  return { care: isVisit || !!i.careThreadId, link: !isVisit || !!i.linkKey };
}
