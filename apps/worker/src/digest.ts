import { choresForToday, type ChoreLike } from '@ohana/shared';
import { inSendWindow } from './window';

export interface DigestChore extends ChoreLike {
  title: string;
}

const MAX_NAMES_SHOWN = 3;

/**
 * Riepilogo push delle faccende alle 8:00 (nessuna email, nessun altro avviso).
 * Include le faccende di oggi e quelle rinviate dai giorni scorsi, ma non quelle già fatte.
 */
export function buildChoreDigest(
  chores: DigestChore[],
  userId: string,
  today: Date,
): { title: string; body: string; count: number } | null {
  const mine = chores.filter((c) => c.assignee_id === userId);
  const { items } = choresForToday(mine, today);
  const todo = items.filter((i) => i.state !== 'done');
  if (todo.length === 0) {
    return null;
  }
  const names = todo.map((i) => i.chore.title);
  const hidden = names.length - MAX_NAMES_SHOWN;
  const body = names.slice(0, MAX_NAMES_SHOWN).join(', ') + (hidden > 0 ? ` e altre ${hidden}` : '');
  return { title: `Faccende di oggi: ${todo.length}`, body, count: todo.length };
}

/** Il riepilogo parte dalle 8:00 e fino a 3 ore dopo (se un giro di cron salta). */
export const inDigestWindow = (now: Date, hour = 8): boolean => inSendWindow(now, hour * 60);
