import type { Occurrence } from './types';

/** «Prossimo»: il primo impegno aperto non ancora iniziato, altrimenti il primo aperto della giornata. */
export function pickNext(openToday: Occurrence[], now: Date): Occurrence | undefined {
  return openToday.find((o) => !o.event.all_day && o.at >= now) ?? openToday[0];
}
