import { MINUTE_MS } from './dates';
import { nextOccurrence } from './recurrence';

export interface ActionEvent {
  starts_at: string;
  ends_at: string | null;
  rrule: string | null;
  status: 'open' | 'done';
}

export interface EventPatch {
  status?: 'open' | 'done';
  last_done_at?: string | null;
  starts_at?: string;
  ends_at?: string | null;
}

/**
 * "Fatto": un impegno singolo passa a `done`; uno ricorrente avanza alla
 * prossima occorrenza (la regola resta valida perché DTSTART si sposta lungo la serie).
 */
export function doneActionPatch(ev: ActionEvent, now: Date): EventPatch {
  const doneAt = now.toISOString();
  if (!ev.rrule) {
    return { status: 'done', last_done_at: doneAt };
  }
  const start = new Date(ev.starts_at);
  const next = nextOccurrence(start, ev.rrule, start > now ? start : now);
  if (!next) {
    return { status: 'done', last_done_at: doneAt };
  }
  const patch: EventPatch = { starts_at: next.toISOString(), last_done_at: doneAt };
  if (ev.ends_at) {
    patch.ends_at = new Date(
      next.getTime() + (new Date(ev.ends_at).getTime() - start.getTime()),
    ).toISOString();
  }
  return patch;
}

/** "Rimanda": sposta un impegno singolo di `minutes`. Per i ricorrenti non si applica (null). */
export function snoozeActionPatch(ev: ActionEvent, minutes: number): EventPatch | null {
  if (ev.rrule) {
    return null;
  }
  const shift = minutes * MINUTE_MS;
  const patch: EventPatch = { starts_at: new Date(new Date(ev.starts_at).getTime() + shift).toISOString() };
  if (ev.ends_at) {
    patch.ends_at = new Date(new Date(ev.ends_at).getTime() + shift).toISOString();
  }
  return patch;
}
