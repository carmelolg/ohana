import { DOC_FOLDERS, daysUntil } from '@ohana/shared';
import type { DocumentRow } from '../../lib/types';

export const DOC_DATE = new Intl.DateTimeFormat('it-IT', {
  timeZone: 'Europe/Rome',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const SOON_DAYS = 30;

/** Cartelle da mostrare: prima quelle note (nell'ordine fisso) che hanno documenti, poi le altre. */
export function foldersOf(docs: DocumentRow[]): string[] {
  return [
    ...new Set([
      ...DOC_FOLDERS.filter((f) => docs.some((d) => d.folder === f)),
      ...docs.map((d) => d.folder),
    ]),
  ];
}

export const docName = (d: DocumentRow): string => d.title || d.attachments?.name || 'Documento';

export interface ExpiryBadge {
  text: string;
  urgent: boolean;
}

/** Etichetta di scadenza: «SCADUTO», oppure «ENTRO <data>» (in evidenza se mancano 30 giorni o meno). */
export function expiryBadge(d: DocumentRow, now: Date): ExpiryBadge | null {
  if (!d.expires_at) {
    return null;
  }
  const on = new Date(d.expires_at + 'T09:00:00');
  const left = daysUntil(on, now);
  return {
    text: left < 0 ? 'SCADUTO' : `ENTRO ${DOC_DATE.format(on).toUpperCase()}`,
    urgent: left <= SOON_DAYS,
  };
}
