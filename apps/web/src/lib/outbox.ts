import { del, get, set } from 'idb-keyval';
import { supabase } from './supabase';

export type Op =
  | {
      id: string;
      table: string;
      action: 'upsert';
      payload: Record<string, unknown> | Record<string, unknown>[];
      onConflict?: string;
    }
  | {
      id: string;
      table: string;
      action: 'update';
      payload: Record<string, unknown>;
      match: Record<string, unknown>;
    }
  | { id: string; table: string; action: 'delete'; match: Record<string, unknown> };

export type NewOp = Op extends infer O ? (O extends { id: string } ? Omit<O, 'id'> : never) : never;

const KEY = 'ohana-outbox';
const listeners = new Set<() => void>();
/** Ascolta i cambi della coda; restituisce la funzione per smettere. */
export function onOutboxChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
const notify = () => listeners.forEach((f) => f());

export const newId = () => crypto.randomUUID();

async function readQueue(): Promise<Op[]> {
  return (await get<Op[]>(KEY)) ?? [];
}
export const pendingCount = async () => (await readQueue()).length;

async function execute(op: Op) {
  const t = supabase.from(op.table);
  const r =
    op.action === 'upsert'
      ? await t.upsert(op.payload as never, { onConflict: op.onConflict })
      : op.action === 'update'
        ? await t.update(op.payload as never).match(op.match)
        : await t.delete().match(op.match);
  if (r.error) {
    throw r.error;
  }
}

const isNetworkError = (e: unknown) =>
  !navigator.onLine ||
  e instanceof TypeError ||
  /fetch|network|Failed to/i.test(String((e as Error)?.message ?? e));

/**
 * Scrittura con coda offline. Gli insert usano upsert con id generato dal client,
 * quindi la riesecuzione dopo un errore di rete è idempotente.
 * Restituisce 'sent' oppure 'queued'. Gli errori applicativi (RLS, vincoli) vengono rilanciati.
 */
export async function write(op: NewOp): Promise<'sent' | 'queued'> {
  const full = { ...op, id: newId() } as Op;
  const queue = await readQueue();
  if (queue.length === 0) {
    try {
      await execute(full);
      return 'sent';
    } catch (e) {
      if (!isNetworkError(e)) {
        throw e;
      }
    }
  }
  await set(KEY, [...queue, full]);
  notify();
  return 'queued';
}

let flushing = false;
export async function flushOutbox(): Promise<number> {
  if (flushing || !navigator.onLine) {
    return 0;
  }
  flushing = true;
  let sent = 0;
  try {
    let queue = await readQueue();
    while (queue.length) {
      try {
        await execute(queue[0]);
      } catch (e) {
        if (isNetworkError(e)) {
          break;
        }
        console.error('Operazione scartata dalla coda', queue[0], e); // errore applicativo: non riprovare all'infinito
      }
      queue = queue.slice(1);
      sent++;
      await set(KEY, queue);
    }
    if (queue.length === 0) {
      await del(KEY);
    }
  } finally {
    flushing = false;
    notify();
  }
  return sent;
}
