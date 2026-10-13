import { chunk, createDb, fetchAll, type Db } from '../db';
import { importedEvents, importIsDue, importWindow, planSync, type StoredImport } from '../calendar-import';
import type { Env } from '../env';
import { fetchIcsText, ImportError, type FetchText } from '../ics-fetch';
import { parseIcs } from '../ics-parse';

const IMPORT_COLUMNS = 'id, space_id, user_id, url, last_synced_at';
const STORED_COLUMNS =
  'id, external_id, title, starts_at, ends_at, all_day, location, notes, local_overrides';
const WRITE_BATCH = 200;

export interface CalendarImport {
  id: string;
  space_id: string;
  user_id: string;
  url: string;
  last_synced_at: string | null;
}

export interface SyncResult {
  ok: boolean;
  /** Messaggio per l'utente se la sincronizzazione non è riuscita. */
  error?: string;
  written: number;
  removed: number;
}

async function writeEvents(db: Db, imp: CalendarImport, rows: ReturnType<typeof planSync>['upserts']) {
  for (const part of chunk(rows, WRITE_BATCH)) {
    const { error } = await db.from('events').upsert(
      part.map((r) => ({
        ...r,
        space_id: imp.space_id,
        import_id: imp.id,
        kind: 'appuntamento',
        created_by: imp.user_id,
      })),
      { onConflict: 'import_id,external_id' },
    );
    if (error) {
      throw new ImportError('Non sono riuscito a salvare gli impegni');
    }
  }
}

async function removeEvents(db: Db, ids: string[]) {
  for (const part of chunk(ids, WRITE_BATCH)) {
    const { error } = await db.from('events').delete().in('id', part);
    if (error) {
      throw new ImportError('Non sono riuscito a salvare gli impegni');
    }
  }
}

/** Allinea gli impegni di uno spazio al calendario collegato: crea, aggiorna, toglie. Registra l'esito sul collegamento. */
export async function syncImport(
  db: Db,
  imp: CalendarImport,
  now: Date,
  fetchText: FetchText = fetchIcsText,
): Promise<SyncResult> {
  try {
    const win = importWindow(now);
    const incoming = importedEvents(parseIcs(await fetchText(imp.url)), win);
    const stored = await fetchAll<StoredImport>((a, b) =>
      db.from('events').select(STORED_COLUMNS).eq('import_id', imp.id).order('id').range(a, b),
    );
    const plan = planSync(stored, incoming, win);
    await writeEvents(db, imp, plan.upserts);
    await removeEvents(db, plan.removeIds);
    await db
      .from('calendar_imports')
      .update({ last_synced_at: now.toISOString(), last_error: null })
      .eq('id', imp.id);
    return { ok: true, written: plan.upserts.length, removed: plan.removeIds.length };
  } catch (e) {
    const error = e instanceof ImportError ? e.message : 'Sincronizzazione non riuscita';
    // niente indirizzo né contenuti nei log: basta sapere quale collegamento e che tipo di errore
    console.error('calendar-sync', imp.id, e instanceof Error ? e.name : 'errore');
    await db
      .from('calendar_imports')
      .update({ last_synced_at: now.toISOString(), last_error: error })
      .eq('id', imp.id);
    return { ok: false, error, written: 0, removed: 0 };
  }
}

/** Job del cron: sincronizza i calendari collegati che ne hanno bisogno. Un calendario che fallisce non ferma gli altri. */
export async function syncCalendarImports(
  env: Env,
  now: Date,
  fetchText: FetchText = fetchIcsText,
  db: Db = createDb(env),
): Promise<number> {
  const imports = await fetchAll<CalendarImport>((a, b) =>
    db.from('calendar_imports').select(IMPORT_COLUMNS).order('id').range(a, b),
  );
  const due = imports.filter((imp) => importIsDue(imp, now));
  for (const imp of due) {
    await syncImport(db, imp, now, fetchText);
  }
  return due.length;
}
