import { describeRrule, formatTime } from '@ohana/shared';
import type { Occurrence } from '../../lib/types';

/** Sull'orario del mattino delle scadenze (09:00) la riga mostra «ENTRO» invece di un orario finto. */
const DEADLINE_DEFAULT_TIME = '09:00';

export const isDeadline = ({ event, at }: Occurrence): boolean =>
  event.categories?.slug === 'scadenza' && !event.all_day && formatTime(at) === DEADLINE_DEFAULT_TIME;

/** Colonna sinistra della riga: giorno, «ENTRO», «GIORNO» o l'orario. */
export function timeColumn(occ: Occurrence, showDay?: string): string {
  if (showDay) {
    return showDay;
  }
  if (isDeadline(occ)) {
    return 'ENTRO';
  }
  return occ.event.all_day ? 'GIORNO' : formatTime(occ.at);
}

/** Riga di dettagli sotto il titolo: spazio, categoria (se non «Altro»), chi accompagna, contatto, ripetizione. */
export function metaLine(
  occ: Occurrence,
  spaceName: string | undefined,
  assigneeFirstName: string | null,
  /** «Papà · Morbo di Crohn», se l'impegno è collegato a una cura. */
  careLabel: string | null = null,
): string {
  const { event } = occ;
  return [
    spaceName,
    event.categories && event.categories.slug !== 'altro' ? event.categories.name : null,
    careLabel,
    assigneeFirstName ? `accompagna ${assigneeFirstName}` : null,
    event.contacts?.name,
    event.rrule ? describeRrule(event.rrule) : null,
  ]
    .filter(Boolean)
    .join(' · ');
}
