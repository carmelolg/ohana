import { isoDayRome } from '@ohana/shared';
import { claimLog, createDb, releaseLog } from '../db';
import { buildChoreDigest, inDigestWindow, type DigestChore } from '../digest';
import type { Env } from '../env';
import { pushToUser } from '../notify';

const DIGEST_HOUR = 8;

/** Riepilogo push delle faccende alle 8:00 a chi lo ha attivato (una volta al giorno, deduplicato in `digest_log`). */
export async function sendChoreDigests(env: Env, now = new Date()): Promise<number> {
  if (!inDigestWindow(now, DIGEST_HOUR)) {
    return 0;
  }
  const db = createDb(env);
  const { data: users } = await db.from('profiles').select('id').eq('notify_chores_push', true);
  const day = isoDayRome(now);
  let sent = 0;
  for (const { id: userId } of users ?? []) {
    const { data: memberships } = await db.from('space_members').select('space_id').eq('user_id', userId);
    const spaceIds = (memberships ?? []).map((m) => m.space_id as string);
    if (!spaceIds.length) {
      continue;
    }
    const { data: chores } = await db
      .from('events')
      .select('id, title, starts_at, rrule, assignee_id, last_done_at')
      .eq('kind', 'faccenda')
      .eq('assignee_id', userId)
      .in('space_id', spaceIds);
    const digest = buildChoreDigest((chores ?? []) as DigestChore[], userId, now);
    if (!digest) {
      continue;
    }
    const logKey = { user_id: userId, day, kind: 'chores' };
    if (!(await claimLog(db, 'digest_log', logKey))) {
      continue;
    } // già inviato oggi
    const delivered = await pushToUser(env, db, userId, {
      title: digest.title,
      body: digest.body,
      url: '/oggi',
      tag: `chores-${day}`,
      data: {},
    });
    if (delivered === 0) {
      await releaseLog(db, 'digest_log', logKey);
    } // nessun dispositivo: riprova al prossimo giro
    else {
      sent++;
    }
  }
  return sent;
}
