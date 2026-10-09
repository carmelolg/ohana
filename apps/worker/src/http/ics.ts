import { DAY_MS } from '@ohana/shared';
import { fetchAll, type Db } from '../db';
import { buildIcs, type IcsEvent } from '../ics';
import type { Env } from '../env';
import { verifyAction } from '../sign';

const EVENT_COLUMNS =
  'id, title, starts_at, ends_at, all_day, location, notes, rrule, status, kind, spaces(name), event_reminders(offset_minutes)';
const PAST_WINDOW_DAYS = 90;

type IcsRow = Omit<IcsEvent, 'space_name'> & { spaces: { name: string } };
const toIcsEvent = ({ spaces, ...e }: IcsRow): IcsEvent => ({ ...e, space_name: spaces.name });

const calendar = (body: string, headers: Record<string, string> = {}) =>
  new Response(body, { headers: { 'Content-Type': 'text/calendar; charset=utf-8', ...headers } });

async function spaceIdsOfFeed(db: Db, feed: { user_id: string; space_id: string | null }): Promise<string[]> {
  if (feed.space_id) {
    return [feed.space_id];
  }
  const { data } = await db
    .from('space_members')
    .select('space_id')
    .eq('user_id', feed.user_id)
    .neq('role', 'care_viewer'); // chi consulta solo la Cura non vede gli impegni dello spazio
  return (data ?? []).map((m) => m.space_id as string);
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
  const rows = await fetchAll<IcsRow>((a, b) =>
    db.from('events').select(EVENT_COLUMNS).in('space_id', spaceIds).order('id').range(a, b),
  );
  const since = Date.now() - PAST_WINDOW_DAYS * DAY_MS;
  const events = rows
    .filter((e) => e.kind !== 'faccenda')
    .filter((e) => e.rrule || new Date(e.starts_at).getTime() > since)
    .map(toIcsEvent);
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
