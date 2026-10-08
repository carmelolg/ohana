import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Env } from './env';

export type Db = SupabaseClient;

/** Client con la chiave di servizio: aggira la RLS, quindi va usato solo per le operazioni del Worker. */
export const createDb = (env: Env): Db =>
  createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

type Page = PromiseLike<{ data: unknown; error: { message: string } | null }>;

/**
 * PostgREST restituisce al massimo `max_rows` righe (1000 su Supabase) senza segnalarlo: una `select` semplice, con il tempo,
 * perderebbe in silenzio impegni e promemoria. Questa legge tutte le pagine.
 */
export async function fetchAll<T>(page: (from: number, to: number) => Page, size = 1000): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await page(from, from + size - 1);
    if (error) {
      throw new Error(error.message);
    }
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < size) {
      return out;
    }
  }
}

export const chunk = <T>(items: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, i * size + size));

/** Scatta una sola volta: esegue `body` solo se riesce a inserire la riga di log (chiave primaria = già inviato). */
export async function claimLog(db: Db, table: string, row: Record<string, unknown>): Promise<boolean> {
  const { error } = await db.from(table).insert(row);
  return !error;
}

export async function releaseLog(db: Db, table: string, match: Record<string, unknown>): Promise<void> {
  await db.from(table).delete().match(match);
}
