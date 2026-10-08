import { useMemo } from 'react';
import { addDaysRome, expandOccurrences, startOfDayRome } from '@ohana/shared';
import { supabase } from '../supabase';
import type { EventRow, Occurrence } from '../types';
import { useAuthedQuery } from './query';

const EVENT_SELECT =
  '*, event_reminders(*), event_checklist_items(*), attachments(*), contacts(name, phone), categories(name, slug)';

/** Impegni nell'intervallo, più tutti i ricorrenti (le occorrenze si calcolano sul dispositivo). */
export function useEvents(from: Date, to: Date) {
  const f = from.toISOString();
  const t = to.toISOString();
  return useAuthedQuery<EventRow[]>(['events', f, t], () =>
    supabase
      .from('events')
      .select(EVENT_SELECT)
      .or(`rrule.not.is.null,and(starts_at.gte.${f},starts_at.lte.${t})`),
  );
}

const WINDOW_PAST_DAYS = 28;
const WINDOW_FUTURE_DAYS = 62;

/** Finestra standard (ultime 4 settimane + 62 giorni) usata da Oggi, ricerca e colonna destra: resta in cache per l'offline. */
export function useEventWindow() {
  const day = new Date().toDateString();
  const { from, to } = useMemo(() => {
    const start = addDaysRome(startOfDayRome(new Date()), -WINDOW_PAST_DAYS);
    return { from: start, to: addDaysRome(start, WINDOW_PAST_DAYS + WINDOW_FUTURE_DAYS) };
    // la finestra si ricalcola solo al cambio di giorno
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day]);
  const query = useEvents(from, to);
  return { ...query, from, to };
}

export function useEvent(id: string | undefined) {
  return useAuthedQuery<EventRow | null>(
    ['event', id],
    () => supabase.from('events').select(EVENT_SELECT).eq('id', id!).maybeSingle(),
    !!id && id !== 'nuovo',
  );
}

/** Espande gli impegni (anche ricorrenti) nelle singole occorrenze tra `from` e `to`, in ordine cronologico. */
export function toOccurrences(events: EventRow[], from: Date, to: Date, spaceFilter: string): Occurrence[] {
  const out: Occurrence[] = [];
  for (const ev of events) {
    if (spaceFilter !== 'all' && ev.space_id !== spaceFilter) {
      continue;
    }
    for (const at of expandOccurrences(new Date(ev.starts_at), ev.rrule, from, to)) {
      out.push({ key: `${ev.id}@${at.toISOString()}`, event: ev, at });
    }
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}
