import { daysUntil } from '@ohana/shared';
import { nextDue } from '../lib/data';
import type { DocumentRow, Maintenance, Procedure } from '../lib/types';

const DAY_MONTH = new Intl.DateTimeFormat('it-IT', {
  timeZone: 'Europe/Rome',
  day: 'numeric',
  month: 'short',
});

interface StatusInput {
  procedures: Procedure[];
  maintenances: Maintenance[];
  documents: DocumentRow[];
}

const EXPIRY_WINDOW_DAYS = 30;

/** Lo stato riassunto mostrato sulle card di Casa e Famiglia. */
export function moreStatus(input: StatusInput, inScope: (spaceId: string) => boolean, now: Date) {
  const open = input.procedures.filter((p) => p.status === 'in_corso' && inScope(p.space_id));
  const dues = input.maintenances
    .filter((m) => inScope(m.space_id))
    .map((m) => nextDue(m))
    .filter((d): d is Date => !!d)
    .sort((a, b) => +a - +b);
  const soon = dues.filter((d) => daysUntil(d, now) <= EXPIRY_WINDOW_DAYS);
  const expiring = input.documents.filter((d) => {
    if (!inScope(d.space_id) || !d.expires_at) {
      return false;
    }
    const left = daysUntil(new Date(d.expires_at + 'T09:00:00'), now);
    return left >= 0 && left <= EXPIRY_WINDOW_DAYS;
  });
  return { open, dues, soon, expiring };
}

/** Stato della card Manutenzioni: quante scadono a breve, altrimenti la prossima data. */
export function maintenanceState(soon: number, next: Date | undefined): string | undefined {
  if (soon) {
    return `${soon} tra 30 gg`;
  }
  return next ? `prossima ${DAY_MONTH.format(next)}` : undefined;
}
