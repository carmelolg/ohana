import { isoDayRome, startOfDayRome } from '../dates';
import { formatPressure } from './params';
import type { EntryLike, EntryType, FollowUpItem } from './visit';

export interface ThreadEntry extends EntryLike {
  follow_ups: FollowUpItem[];
}

export interface ThreadEvent {
  id: string;
  care_thread_id: string | null;
  starts_at: string;
  status: 'open' | 'done';
  title: string;
}

export interface ThreadOverview {
  count: number;
  last: { date: string; type: EntryType } | null;
  /** Il prossimo passo: un impegno già in calendario oppure un prossimo passo ancora da fissare. */
  next:
    | { kind: 'impegno'; date: string; title: string }
    | { kind: 'passo'; title: string; hint: string | null }
    | null;
}

/** Riepilogo di un filone per la scheda (4a): quanti tasselli, l'ultimo e il prossimo. */
export function threadOverview(
  entries: ThreadEntry[],
  events: ThreadEvent[],
  threadId: string,
  now: Date,
): ThreadOverview {
  const own = entries.filter((e) => e.thread_id === threadId);
  const newest = [...own].sort((a, b) => b.entry_date.localeCompare(a.entry_date))[0];
  const todayStart = startOfDayRome(now).getTime();
  const upcoming = events
    .filter(
      (e) =>
        e.care_thread_id === threadId && e.status === 'open' && new Date(e.starts_at).getTime() >= todayStart,
    )
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];
  const step = own
    .flatMap((e) => e.follow_ups)
    .filter((f) => !f.event_id)
    .sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'))[0];
  return {
    count: own.length,
    last: newest ? { date: newest.entry_date, type: newest.type } : null,
    next: upcoming
      ? { kind: 'impegno', date: isoDayRome(new Date(upcoming.starts_at)), title: upcoming.title }
      : step
        ? { kind: 'passo', title: step.title, hint: step.due_hint ?? step.due_date ?? null }
        : null,
  };
}

/** Valori chiave del filone (4b): l'ultima misura di ciascun parametro monitorato. */
export function latestReadings(
  entries: Pick<EntryLike, 'entry_date' | 'readings'>[],
  keys: string[],
): { key: string; value: unknown }[] {
  const sorted = [...entries].sort((a, b) => b.entry_date.localeCompare(a.entry_date));
  return keys.flatMap((key) => {
    const found = sorted.find((e) => key in e.readings);
    return found ? [{ key, value: found.readings[key] }] : [];
  });
}

export interface ThreadMeasure {
  type: string;
  value: number;
  value2: number | null;
  measured_at: string;
}

const NOON_UTC = 'T12:00:00Z';

/**
 * Valori chiave del filone con anche le misure registrate dal pulsante «Misura» (che non sono tasselli):
 * per ogni parametro vince il valore più recente tra tasselli e misure. Oltre ai parametri monitorati compaiono
 * quelli misurati per questo filone.
 */
export function threadValues(
  entries: Pick<EntryLike, 'entry_date' | 'readings'>[],
  measures: ThreadMeasure[],
  keys: string[],
): { key: string; value: unknown }[] {
  const allKeys = [...new Set([...keys, ...measures.map((m) => m.type)])];
  return allKeys.flatMap((key) => {
    const fromEntry = entries
      .filter((e) => key in e.readings)
      .map((e) => ({ at: Date.parse(e.entry_date + NOON_UTC), value: e.readings[key] }));
    const fromMeasure = measures
      .filter((m) => m.type === key)
      .map((m) => ({
        at: Date.parse(m.measured_at),
        value: m.value2 == null ? m.value : formatPressure(m.value, m.value2),
      }));
    const latest = [...fromEntry, ...fromMeasure].sort((a, b) => b.at - a.at)[0];
    return latest ? [{ key, value: latest.value }] : [];
  });
}
