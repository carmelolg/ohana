import type { Env } from './env';
import { sendBoardPushes } from './jobs/board-push';
import { sendDoseReminders } from './jobs/care-doses';
import { sendChoreDigests } from './jobs/chore-digest';
import { dispatch } from './jobs/dispatch';
import { enqueue } from './jobs/enqueue';
import { syncCalendarImports } from './jobs/calendar-sync';
import { sendBriefs } from './jobs/morning-brief';

type Job = [name: string, run: (env: Env, now: Date) => Promise<unknown>];

// Ogni lavoro è indipendente: se uno fallisce, gli altri girano comunque.
const JOBS: Job[] = [
  ['enqueue', enqueue],
  ['dispatch', dispatch],
  ['brief', sendBriefs],
  ['chores', sendChoreDigests],
  ['board', sendBoardPushes],
  ['dosi', sendDoseReminders],
  ['calendari', syncCalendarImports],
];

/** Un giro di cron (ogni 5 minuti): accoda, invia e prepara i riepiloghi. */
export async function runScheduledJobs(env: Env, now = new Date()): Promise<void> {
  for (const [name, run] of JOBS) {
    try {
      const result = await run(env, now);
      if (name === 'dispatch') {
        console.log(name, result);
      }
    } catch (e) {
      console.error(name, e);
    }
  }
}
