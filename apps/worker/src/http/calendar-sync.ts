import type { Db } from '../db';
import type { Env } from '../env';
import { syncImport, type CalendarImport } from '../jobs/calendar-sync';
import { fetchIcsText, type FetchText } from '../ics-fetch';
import { jsonResponse } from './respond';
import { scanCors } from './scan-parse';

/** Dopo una sincronizzazione, per qualche secondo non se ne fa un'altra: il pulsante non deve martellare il calendario. */
const MIN_GAP_MS = 20_000;
const WRITER_ROLES = ['owner', 'admin', 'member'];

/**
 * `POST /calendar/sync` `{ id }`: sincronizza subito un calendario collegato («Sincronizza ora» e primo collegamento).
 * Serve l'accesso dell'utente, che deve poter scrivere nello spazio del calendario.
 */
export async function handleCalendarSync(
  req: Request,
  env: Env,
  db: Db,
  fetchText: FetchText = fetchIcsText,
  now = new Date(),
): Promise<Response> {
  const reply = (body: unknown, status = 200) => jsonResponse(body, status, scanCors(env));
  const token = /^Bearer (.+)$/.exec(req.headers.get('Authorization') ?? '')?.[1];
  const { data: auth } = token ? await db.auth.getUser(token) : { data: { user: null } };
  if (!auth.user) {
    return reply({ error: 'auth' }, 401);
  }
  const body = (await req.json().catch(() => null)) as { id?: unknown } | null;
  if (typeof body?.id !== 'string') {
    return reply({ error: 'richiesta non valida' }, 400);
  }
  const { data: imp } = await db
    .from('calendar_imports')
    .select('id, space_id, user_id, url, last_synced_at')
    .eq('id', body.id)
    .maybeSingle();
  if (!imp) {
    return reply({ error: 'non trovato' }, 404);
  }
  const { data: member } = await db
    .from('space_members')
    .select('role')
    .eq('space_id', imp.space_id)
    .eq('user_id', auth.user.id)
    .maybeSingle();
  if (!member || !WRITER_ROLES.includes(member.role as string)) {
    return reply({ error: 'non trovato' }, 404); // stessa risposta di «non esiste»: non rivela i calendari altrui
  }
  const recent = imp.last_synced_at && now.getTime() - new Date(imp.last_synced_at).getTime() < MIN_GAP_MS;
  if (recent) {
    return reply({ ok: true, skipped: true });
  }
  return reply(await syncImport(db, imp as CalendarImport, now, fetchText));
}
