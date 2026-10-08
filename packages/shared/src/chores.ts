import { dayDiffRome, sameDayRome } from './dates';

export interface ChoreLike {
  id: string;
  starts_at: string;
  rrule: string | null;
  assignee_id: string | null;
  last_done_at: string | null;
}

export type ChoreState = 'due' | 'rinviata' | 'done';
export interface ChoreItem<T extends ChoreLike> {
  chore: T;
  state: ChoreState;
  /** giorni di ritardo (solo per `rinviata`): 1 = «ieri» */
  daysLate: number;
}

/**
 * Faccende da mostrare in «Oggi».
 * Una faccenda mantiene in `starts_at` l'occorrenza ancora da fare; «fatto» la sposta alla successiva e valorizza `last_done_at`.
 * - scadenza oggi → `due`;
 * - scadenza passata e non fatta → compare oggi come `rinviata` (una sola riga, mai «scaduta», nessun avviso in più);
 * - fatta oggi → `done` (barrata);
 * - scadenza futura → non compare.
 */
export function choresForToday<T extends ChoreLike>(
  chores: T[],
  today: Date,
): { items: ChoreItem<T>[]; done: number; total: number } {
  const items: ChoreItem<T>[] = [];
  for (const chore of chores) {
    const doneToday = chore.last_done_at != null && sameDayRome(new Date(chore.last_done_at), today);
    const diff = dayDiffRome(new Date(chore.starts_at), today); // >0: la scadenza è nel passato
    if (diff === 0) {
      items.push({ chore, state: 'due', daysLate: 0 });
    } else if (diff > 0) {
      items.push({ chore, state: 'rinviata', daysLate: diff });
    } else if (doneToday) {
      items.push({ chore, state: 'done', daysLate: 0 });
    }
  }
  // le fatte in fondo, poi le rinviate prima delle odierne
  const order: Record<ChoreState, number> = { rinviata: 0, due: 1, done: 2 };
  items.sort((a, b) => order[a.state] - order[b.state]);
  const done = items.filter((i) => i.state === 'done').length;
  return { items, done, total: items.length };
}

/** «ieri, rinviata» · «rinviata da 3 gg» */
export const rinviataLabel = (daysLate: number) =>
  daysLate === 1 ? 'ieri, rinviata' : `rinviata da ${daysLate} gg`;
