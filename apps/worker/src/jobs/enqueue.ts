import { DAY_MS } from '@ohana/shared';
import { chunk, createDb, fetchAll, type Db } from '../db';
import type { Env } from '../env';
import { buildQueueRows, type QEvent, type QRecipient, type QueueRow } from '../reminders';

const LOOKBACK_DAYS = 1;
const LOOKAHEAD_DAYS = 95;
const DELETE_BATCH = 200;
const UPSERT_BATCH = 500;

interface MemberRow {
  space_id: string;
  profiles: { id: string; notify_email: boolean; morning_brief: boolean };
}
type QueueKey = Pick<QueueRow, 'event_id' | 'occurrence_at' | 'user_id' | 'channel'>;

const rowKey = (r: QueueKey) =>
  `${r.event_id}|${new Date(r.occurrence_at).toISOString()}|${r.user_id}|${r.channel}`;

/** Impegni che possono generare promemoria: tutti i ricorrenti più i singoli nella finestra. */
function loadEvents(db: Db, now: Date): Promise<QEvent[]> {
  const lo = new Date(now.getTime() - LOOKBACK_DAYS * DAY_MS).toISOString();
  const hi = new Date(now.getTime() + LOOKAHEAD_DAYS * DAY_MS).toISOString();
  return fetchAll<QEvent>((a, b) =>
    db
      .from('events')
      .select(
        'id, space_id, title, starts_at, rrule, status, assignee_id, kind, event_reminders(offset_minutes, channels)',
      )
      .or(`rrule.not.is.null,and(starts_at.gte.${lo},starts_at.lte.${hi})`)
      .order('id')
      .range(a, b),
  );
}

/** Destinatari per spazio, con le preferenze di notifica e la presenza di almeno un dispositivo push. */
async function loadRecipientsBySpace(db: Db): Promise<Map<string, QRecipient[]>> {
  const [members, subs] = await Promise.all([
    fetchAll<MemberRow>((a, b) =>
      db
        .from('space_members')
        .select('space_id, profiles(id, notify_email, morning_brief)')
        .neq('role', 'care_viewer') // consulta solo la Cura: niente promemoria degli impegni
        .order('space_id')
        .order('user_id')
        .range(a, b),
    ),
    fetchAll<{ user_id: string }>((a, b) =>
      db.from('push_subscriptions').select('user_id').order('id').range(a, b),
    ),
  ]);
  const withPush = new Set(subs.map((s) => s.user_id));
  const bySpace = new Map<string, QRecipient[]>();
  for (const { space_id, profiles: p } of members) {
    const list = bySpace.get(space_id) ?? [];
    list.push({
      id: p.id,
      notify_email: p.notify_email,
      morning_brief: p.morning_brief,
      hasPush: withPush.has(p.id),
    });
    bySpace.set(space_id, list);
  }
  return bySpace;
}

/** Rimuove le righe non ancora inviate che non sono più valide (promemoria modificato, impegno fatto o eliminato…). */
async function removeStale(db: Db, wanted: QueueRow[]): Promise<void> {
  const wantedKeys = new Set(wanted.map(rowKey));
  const pending = await fetchAll<QueueKey & { id: string }>((a, b) =>
    db
      .from('reminder_queue')
      .select('id, event_id, occurrence_at, user_id, channel')
      .is('sent_at', null)
      .order('id')
      .range(a, b),
  );
  const staleIds = pending.filter((r) => !wantedKeys.has(rowKey(r))).map((r) => r.id);
  for (const ids of chunk(staleIds, DELETE_BATCH)) {
    await db.from('reminder_queue').delete().in('id', ids).is('sent_at', null);
  }
}

async function insertMissing(db: Db, wanted: QueueRow[]): Promise<void> {
  for (const part of chunk(wanted, UPSERT_BATCH)) {
    const { error } = await db
      .from('reminder_queue')
      .upsert(part, { onConflict: 'event_id,occurrence_at,user_id,channel', ignoreDuplicates: true });
    if (error) {
      throw error;
    }
  }
}

/** Espande promemoria × occorrenze × destinatari nella coda di invio. Idempotente. Restituisce quante righe sono volute. */
export async function enqueue(env: Env, now = new Date()): Promise<number> {
  const db = createDb(env);
  const [events, recipients] = await Promise.all([loadEvents(db, now), loadRecipientsBySpace(db)]);
  const wanted = buildQueueRows(events, recipients, now);
  await removeStale(db, wanted);
  await insertMissing(db, wanted);
  return wanted.length;
}
