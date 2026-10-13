import { HOUR_MS, shortName } from '@ohana/shared';
import { createDb, type Db } from '../db';
import type { Env } from '../env';
import { deliverPush, subscriptionsOf, type PushOutcome } from '../notify';

const MAX_BODY_LENGTH = 160;

interface BoardNote {
  id: string;
  space_id: string;
  author_id: string;
  text: string;
  expires_at: string | null;
  spaces: { name: string };
}

/** Claim atomico: una sola esecuzione del cron avvisa per ogni nota. */
async function claimNote(db: Db, id: string, now: Date): Promise<boolean> {
  const { data } = await db
    .from('board_notes')
    .update({ notified_at: now.toISOString() })
    .eq('id', id)
    .is('notified_at', null)
    .select('id');
  return !!data?.length;
}

/** Rilascia la prenotazione: l'invio non è partito, il giro successivo deve poter riprovare. */
async function releaseNote(db: Db, id: string): Promise<void> {
  await db.from('board_notes').update({ notified_at: null }).eq('id', id);
}

async function notifyMembers(env: Env, db: Db, note: BoardNote): Promise<PushOutcome> {
  const [{ data: members }, { data: author }] = await Promise.all([
    db.from('space_members').select('user_id').eq('space_id', note.space_id).neq('role', 'care_viewer'), // chi consulta solo la Cura non vede la bacheca
    db.from('profiles').select('first_name, nickname').eq('id', note.author_id).maybeSingle(),
  ]);
  const who = (author && shortName(author)) || 'Qualcuno';
  const msg = {
    title: `Bacheca · ${note.spaces.name}`,
    body: `${who}: ${note.text}`.slice(0, MAX_BODY_LENGTH),
    url: '/oggi',
    tag: `board-${note.id}`,
    actions: [],
    data: {},
  };
  const total: PushOutcome = { delivered: 0, errors: [] };
  for (const m of members ?? []) {
    if (m.user_id !== note.author_id) {
      const subs = await subscriptionsOf(db, m.user_id as string);
      const { delivered, errors } = await deliverPush(env, db, subs, msg);
      total.delivered += delivered;
      total.errors.push(...errors);
    }
  }
  return total;
}

/** Note in bacheca con avviso push richiesto dall'autore (nelle ultime 24 ore, non ancora notificate né scadute). */
export async function sendBoardPushes(env: Env, now = new Date()): Promise<number> {
  const db = createDb(env);
  const since = new Date(now.getTime() - 24 * HOUR_MS).toISOString();
  const { data } = await db
    .from('board_notes')
    .select('id, space_id, author_id, text, expires_at, spaces(name)')
    .eq('notify_push', true)
    .is('notified_at', null)
    .gte('created_at', since);
  let sent = 0;
  for (const note of (data ?? []) as unknown as BoardNote[]) {
    if (!(await claimNote(db, note.id, now))) {
      continue;
    }
    if (note.expires_at && new Date(note.expires_at) < now) {
      continue;
    }
    const { delivered, errors } = await notifyMembers(env, db, note);
    for (const e of errors) {
      console.error('push bacheca fallito', e);
    }
    // Se almeno un dispositivo ha ricevuto l'avviso la prenotazione resta (niente doppioni); se tutti gli invii sono
    // falliti la rilascio. Nessun dispositivo iscritto non è un errore: non c'è nulla da riprovare.
    if (delivered === 0 && errors.length > 0) {
      await releaseNote(db, note.id);
    }
    sent += delivered;
  }
  return sent;
}
