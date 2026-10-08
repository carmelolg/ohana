import { formatTime, HOUR_MS, MINUTE_MS, shortName, fullName } from '@ohana/shared';
import { createDb, type Db } from '../db';
import { dateVars, renderReminder, sendEmail, whenRelative } from '../email';
import type { Env } from '../env';
import { deliverPush, type StoredSubscription } from '../notify';
import { signAction } from '../sign';

const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 100;
const MAX_LATENESS_MS = 24 * HOUR_MS; // promemoria perso: non inviare in ritardo
const NONE = '—';

interface DueRow {
  id: string;
  event_id: string;
  occurrence_at: string;
  send_at: string;
  user_id: string;
  channel: 'email' | 'push';
  attempts: number;
}
interface EventRow {
  id: string;
  title: string;
  location: string | null;
  notes: string | null;
  status: string;
  rrule: string | null;
  starts_at: string;
  assignee_id: string | null;
  spaces: { name: string; color_hue: number };
  contacts: { name: string; phone: string | null } | null;
  event_reminders: { offset_minutes: number }[];
}
interface Recipient {
  id: string;
  first_name: string;
  nickname: string | null;
  email: string;
}
interface Person {
  id: string;
  first_name: string;
  last_name: string;
  nickname: string | null;
}

/** Tutto ciò che serve a comporre i messaggi di un lotto, caricato in poche query. */
interface Lookups {
  events: Map<string, EventRow>;
  recipients: Map<string, Recipient>;
  assignees: Map<string, string>;
  subscriptions: (StoredSubscription & { user_id: string })[];
}

const unique = <T>(items: T[]): T[] => [...new Set(items)];

async function loadDue(db: Db, now: Date): Promise<DueRow[]> {
  const { data, error } = await db
    .from('reminder_queue')
    .select('id, event_id, occurrence_at, send_at, user_id, channel, attempts')
    .is('sent_at', null)
    .lte('send_at', now.toISOString())
    .lt('attempts', MAX_ATTEMPTS)
    .order('send_at')
    .limit(BATCH_SIZE);
  if (error) {
    throw error;
  }
  return (data ?? []) as DueRow[];
}

async function loadLookups(db: Db, rows: DueRow[]): Promise<Lookups> {
  const eventIds = unique(rows.map((r) => r.event_id));
  const userIds = unique(rows.map((r) => r.user_id));
  const [{ data: events }, { data: recipients }, { data: subs }] = await Promise.all([
    db
      .from('events')
      .select(
        'id, title, location, notes, status, rrule, starts_at, assignee_id, spaces(name, color_hue), contacts(name, phone), event_reminders(offset_minutes)',
      )
      .in('id', eventIds),
    db.from('profiles').select('id, first_name, nickname, email').in('id', userIds),
    db.from('push_subscriptions').select('id, user_id, endpoint, keys').in('user_id', userIds),
  ]);
  const eventRows = (events ?? []) as unknown as EventRow[];
  const assigneeIds = unique(eventRows.map((e) => e.assignee_id).filter((id): id is string => !!id));
  const { data: people } = assigneeIds.length
    ? await db.from('profiles').select('id, first_name, last_name, nickname').in('id', assigneeIds)
    : { data: [] };
  return {
    events: new Map(eventRows.map((e) => [e.id, e])),
    recipients: new Map(((recipients ?? []) as Recipient[]).map((p) => [p.id, p])),
    assignees: new Map(((people ?? []) as Person[]).map((p) => [p.id, fullName(p)])),
    subscriptions: (subs ?? []) as Lookups['subscriptions'],
  };
}

/** Claim idempotente: solo chi riesce a impostare `sent_at` invia. */
async function claim(db: Db, row: DueRow, now: Date): Promise<boolean> {
  const { data } = await db
    .from('reminder_queue')
    .update({ sent_at: now.toISOString() })
    .eq('id', row.id)
    .is('sent_at', null)
    .select('id');
  return !!data?.length;
}

/** Rimette in coda per un nuovo tentativo; all'ultimo la riga resta segnata come inviata per non riprovare all'infinito. */
async function recordFailure(db: Db, row: DueRow, now: Date): Promise<void> {
  const attempts = row.attempts + 1;
  await db
    .from('reminder_queue')
    .update({ sent_at: attempts >= MAX_ATTEMPTS ? now.toISOString() : null, attempts })
    .eq('id', row.id);
}

const isStale = (row: DueRow, ev: EventRow, now: Date) =>
  now.getTime() - new Date(row.send_at).getTime() > MAX_LATENESS_MS || (ev.status === 'done' && !ev.rrule);

interface Links {
  done: string;
  snooze: string;
  snoozeHour: string;
  ics: string;
}

function linksFor(env: Env, token: string): Links {
  const action = `${env.WORKER_URL}/azione/${token}`;
  return {
    done: `${action}?a=done`,
    snooze: `${action}?a=snooze`,
    snoozeHour: `${action}?a=snooze&m=60`,
    ics: `${env.WORKER_URL}/ics/e/${token}.ics`,
  };
}

/** Tutto ciò che serve a comporre il messaggio di un promemoria (email o push). */
interface Delivery {
  env: Env;
  db: Db;
  row: DueRow;
  event: EventRow;
  lookups: Lookups;
  /** Occorrenza a cui si riferisce il promemoria. */
  occurrence: Date;
  /** «Domani», «Tra 2 ore»… */
  relative: string;
  links: Links;
}

async function sendReminderEmail(d: Delivery, user: Recipient): Promise<void> {
  const { env, event: ev, occurrence, relative } = d;
  const html = renderReminder({
    first_name: shortName(user),
    space_name: ev.spaces.name,
    space_color: `oklch(0.6 0.1 ${ev.spaces.color_hue})`,
    when_relative: relative,
    event_title: ev.title,
    ...dateVars(occurrence),
    location: ev.location ?? NONE,
    assignee: (ev.assignee_id && d.lookups.assignees.get(ev.assignee_id)) || NONE,
    notes: ev.notes ?? NONE,
    contact_name: ev.contacts?.name ?? NONE,
    contact_phone: ev.contacts?.phone ?? '',
    event_url: `${env.APP_URL}/evento/${ev.id}`,
    done_url: d.links.done,
    snooze_url: d.links.snooze,
    ics_url: d.links.ics,
    settings_url: `${env.APP_URL}/impostazioni`,
  });
  await sendEmail(env, user.email, `${relative}: ${ev.title} alle ${formatTime(occurrence)}`, html);
}

async function sendReminderPush(d: Delivery): Promise<void> {
  const { event: ev, row } = d;
  const mine = d.lookups.subscriptions.filter((s) => s.user_id === row.user_id);
  const { errors } = await deliverPush(d.env, d.db, mine, {
    title: ev.title,
    body: `${d.relative} alle ${formatTime(d.occurrence)} · ${ev.spaces.name}`,
    url: `/evento/${ev.id}`,
    tag: `${ev.id}-${row.occurrence_at}`,
    data: { doneUrl: d.links.done, snoozeUrl: d.links.snoozeHour },
  });
  if (errors.length) {
    throw errors[0];
  } // un dispositivo non raggiunto: la riga torna in coda
}

/** Invia un singolo promemoria. Restituisce `false` se non va inviato (impegno scomparso, già fatto, troppo vecchio). */
async function deliver(env: Env, db: Db, row: DueRow, lookups: Lookups, now: Date): Promise<boolean> {
  const event = lookups.events.get(row.event_id);
  const user = lookups.recipients.get(row.user_id);
  if (!event || !user || isStale(row, event, now)) {
    return false;
  }
  const occurrence = new Date(row.occurrence_at);
  const offset = Math.round((occurrence.getTime() - new Date(row.send_at).getTime()) / MINUTE_MS);
  const delivery: Delivery = {
    env,
    db,
    row,
    event,
    lookups,
    occurrence,
    relative: whenRelative(occurrence, now, offset),
    links: linksFor(env, await signAction(env.ACTION_SECRET, event.id)),
  };
  if (row.channel === 'email') {
    await sendReminderEmail(delivery, user);
  } else {
    await sendReminderPush(delivery);
  }
  return true;
}

/** Invia i promemoria scaduti (al più un lotto per giro di cron). */
export async function dispatch(env: Env, now = new Date()): Promise<{ sent: number; failed: number }> {
  const db = createDb(env);
  const rows = await loadDue(db, now);
  if (rows.length === 0) {
    return { sent: 0, failed: 0 };
  }
  const lookups = await loadLookups(db, rows);

  let sent = 0;
  let failed = 0;
  for (const row of rows) {
    if (!(await claim(db, row, now))) {
      continue;
    }
    try {
      if (await deliver(env, db, row, lookups, now)) {
        sent++;
      }
    } catch (e) {
      failed++;
      console.error('invio fallito', row.id, e);
      await recordFailure(db, row, now);
    }
  }
  return { sent, failed };
}
