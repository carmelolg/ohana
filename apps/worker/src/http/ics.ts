import { fetchAll, type Db } from '../db';
import { buildIcs, selectFeedEvents, type IcsEvent } from '../ics';
import type { Env } from '../env';
import { verifyAction } from '../sign';

const EVENT_COLUMNS =
  'id, title, starts_at, ends_at, all_day, location, notes, rrule, status, kind, import_id, care_thread_id, medication_id, spaces(name), event_reminders(offset_minutes)';

type IcsRow = Omit<IcsEvent, 'space_name' | 'private'> & {
  spaces: { name: string };
  care_thread_id: string | null;
  medication_id: string | null;
};
const toIcsEvent = ({ spaces, care_thread_id, medication_id, ...e }: IcsRow): IcsEvent => ({
  ...e,
  space_name: spaces.name,
  private: !!care_thread_id || !!medication_id,
});

const calendar = (body: string, headers: Record<string, string> = {}) =>
  new Response(body, { headers: { 'Content-Type': 'text/calendar; charset=utf-8', ...headers } });

/**
 * Spazi che il feed può mostrare, verificati ora: chi esce da uno spazio (o ne diventa solo `care_viewer`, che non vede
 * gli impegni) smette di leggerlo anche se conserva un vecchio link.
 */
async function spaceIdsOfFeed(db: Db, feed: { user_id: string; space_id: string | null }): Promise<string[]> {
  const { data } = await db
    .from('space_members')
    .select('space_id')
    .eq('user_id', feed.user_id)
    .neq('role', 'care_viewer');
  const member = (data ?? []).map((m) => m.space_id as string);
  return feed.space_id ? member.filter((id) => id === feed.space_id) : member;
}

/** `GET /ics/:token.ics`: feed di calendario in sola lettura (per utente o per spazio). Le faccende non ne fanno parte. */
export async function handleFeed(db: Db, token: string): Promise<Response> {
  const { data: feed } = await db
    .from('calendar_feeds')
    .select('user_id, space_id')
    .eq('token', token)
    .maybeSingle();
  if (!feed) {
    return new Response('Not found', { status: 404 });
  }
  const spaceIds = await spaceIdsOfFeed(db, feed);
  if (feed.space_id && spaceIds.length === 0) {
    return new Response('Not found', { status: 404 }); // non fa più parte dello spazio: il client del calendario segnala l'errore
  }
  const rows = await fetchAll<IcsRow>((a, b) =>
    db.from('events').select(EVENT_COLUMNS).in('space_id', spaceIds).order('id').range(a, b),
  );
  const events = selectFeedEvents(rows.map(toIcsEvent), Date.now());
  return calendar(buildIcs(events, feed.space_id ? 'Ohana' : 'Ohana · Tutti gli spazi'), {
    'Cache-Control': 'public, max-age=900',
  });
}

/** `GET /ics/e/:token.ics`: un singolo impegno, per il pulsante «Aggiungi al calendario» delle email. */
export async function handleSingleEvent(env: Env, db: Db, token: string): Promise<Response> {
  const payload = await verifyAction(env.ACTION_SECRET, token);
  if (!payload) {
    return new Response('Link scaduto', { status: 410 });
  }
  const { data } = await db.from('events').select(EVENT_COLUMNS).eq('id', payload.e).maybeSingle();
  if (!data) {
    return new Response('Not found', { status: 404 });
  }
  const event = toIcsEvent(data as unknown as IcsRow);
  return calendar(buildIcs([event], event.title), {
    'Content-Disposition': 'attachment; filename="impegno.ics"',
  });
}
