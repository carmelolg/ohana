import type { Db } from './db';
import type { Env } from './env';
import { GoneError, sendPush, type PushMessage, type PushTarget } from './push';

export interface StoredSubscription extends PushTarget {
  id: string;
}

export interface PushOutcome {
  delivered: number;
  errors: unknown[];
}

/** Invia a tutti i dispositivi indicati; quelli non più validi (404/410) vengono rimossi. Gli altri errori sono restituiti, non lanciati. */
export async function deliverPush(
  env: Env,
  db: Db,
  subs: StoredSubscription[],
  msg: PushMessage,
): Promise<PushOutcome> {
  const outcome: PushOutcome = { delivered: 0, errors: [] };
  for (const sub of subs) {
    try {
      await sendPush(env, sub, msg);
      outcome.delivered++;
    } catch (e) {
      if (e instanceof GoneError) {
        await db.from('push_subscriptions').delete().eq('id', sub.id);
      } else {
        outcome.errors.push(e);
      }
    }
  }
  return outcome;
}

export async function subscriptionsOf(db: Db, userId: string): Promise<StoredSubscription[]> {
  const { data } = await db.from('push_subscriptions').select('id, endpoint, keys').eq('user_id', userId);
  return (data ?? []) as StoredSubscription[];
}

/** Push a una persona su tutti i suoi dispositivi. Restituisce quanti ne hanno ricevuto il messaggio. */
export async function pushToUser(env: Env, db: Db, userId: string, msg: PushMessage): Promise<number> {
  const { delivered, errors } = await deliverPush(env, db, await subscriptionsOf(db, userId), msg);
  for (const e of errors) {
    console.error('push fallito', e);
  }
  return delivered;
}
