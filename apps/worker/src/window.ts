import { minutesOfDayRome } from '@ohana/shared';

/** Quanti minuti dopo l'orario previsto un invio è ancora valido (se un giro di cron salta, il successivo recupera). */
export const SEND_GRACE_MINUTES = 180;

/** `true` se `now` (ora di Roma) è entro la finestra che inizia a `startMinute` (minuti dalla mezzanotte). */
export function inSendWindow(now: Date, startMinute: number): boolean {
  const elapsed = minutesOfDayRome(now) - startMinute;
  return elapsed >= 0 && elapsed <= SEND_GRACE_MINUTES;
}

/** «07:30» o «07:30:00» → minuti dalla mezzanotte. */
export function parseClock(hhmm: string): number {
  const [h, m] = String(hhmm).split(':').map(Number);
  return h * 60 + m;
}
