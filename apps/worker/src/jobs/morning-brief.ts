import {
  addDaysRome,
  expandOccurrences,
  formatTime,
  isoDayRome,
  shortName,
  startOfDayRome,
} from '@ohana/shared';
import { claimLog, createDb, fetchAll, releaseLog, type Db } from '../db';
import { renderBrief, sendEmail } from '../email';
import type { Env } from '../env';
import { deliverPush, subscriptionsOf } from '../notify';
import { inSendWindow, parseClock } from '../window';

interface BriefUser {
  id: string;
  first_name: string;
  nickname: string | null;
  email: string;
  notify_email: boolean;
  morning_brief_time: string;
}
interface BriefEventRow {
  title: string;
  starts_at: string;
  rrule: string | null;
  status: string;
  assignee_id: string | null;
  spaces: { name: string };
}
interface BriefItem {
  at: Date;
  time: string;
  title: string;
  space: string;
}

const pluralize = (n: number) => `${n} ${n === 1 ? 'impegno' : 'impegni'}`;

async function spaceIdsOf(db: Db, userId: string): Promise<string[]> {
  const { data } = await db.from('space_members').select('space_id').eq('user_id', userId);
  return (data ?? []).map((m) => m.space_id as string);
}

/** Impegni di oggi (non faccende) di quella persona: i suoi o non assegnati, anche da ricorrenze. */
async function todaysItems(db: Db, user: BriefUser, spaceIds: string[], now: Date): Promise<BriefItem[]> {
  const rows = await fetchAll<BriefEventRow>((a, b) =>
    db
      .from('events')
      .select('id, title, starts_at, rrule, status, assignee_id, kind, spaces(name)')
      .in('space_id', spaceIds)
      .neq('kind', 'faccenda')
      .order('id')
      .range(a, b),
  );
  const from = startOfDayRome(now);
  const to = new Date(addDaysRome(from, 1).getTime() - 1);
  const items: BriefItem[] = [];
  for (const e of rows) {
    if (e.status !== 'open' || (e.assignee_id && e.assignee_id !== user.id)) {
      continue;
    }
    for (const at of expandOccurrences(new Date(e.starts_at), e.rrule, from, to)) {
      items.push({ at, time: formatTime(at), title: e.title, space: e.spaces.name });
    }
  }
  return items.sort((a, b) => a.at.getTime() - b.at.getTime());
}

async function deliverBrief(
  env: Env,
  db: Db,
  user: BriefUser,
  items: BriefItem[],
  day: string,
): Promise<void> {
  if (user.notify_email) {
    await sendEmail(
      env,
      user.email,
      `La tua giornata: ${pluralize(items.length)}`,
      renderBrief(shortName(user), items, env.APP_URL),
    );
  }
  const { errors } = await deliverPush(env, db, await subscriptionsOf(db, user.id), {
    title: `Oggi: ${pluralize(items.length)}`,
    body: items
      .slice(0, 3)
      .map((i) => `${i.time} ${i.title}`)
      .join(' · '),
    url: '/oggi',
    tag: `brief-${day}`,
    data: {},
  });
  for (const e of errors) {
    console.error('push brief fallito', user.id, e);
  }
}

/** Brief del mattino: una sola email/push con gli impegni del giorno, all'orario scelto da ciascuno. */
export async function sendBriefs(env: Env, now = new Date()): Promise<number> {
  const db = createDb(env);
  const { data } = await db
    .from('profiles')
    .select('id, first_name, nickname, email, notify_email, morning_brief_time')
    .eq('morning_brief', true);
  const day = isoDayRome(now);
  let sent = 0;
  for (const user of (data ?? []) as BriefUser[]) {
    if (!inSendWindow(now, parseClock(user.morning_brief_time))) {
      continue;
    }
    if (!(await claimLog(db, 'brief_log', { user_id: user.id, day }))) {
      continue;
    } // già inviato oggi (chiave primaria)
    const spaceIds = await spaceIdsOf(db, user.id);
    if (!spaceIds.length) {
      continue;
    }
    const items = await todaysItems(db, user, spaceIds, now);
    if (!items.length) {
      continue;
    }
    try {
      await deliverBrief(env, db, user, items, day);
      sent++;
    } catch (e) {
      console.error('brief fallito', user.id, e);
      await releaseLog(db, 'brief_log', { user_id: user.id, day }); // riprova al prossimo giro
    }
  }
  return sent;
}
