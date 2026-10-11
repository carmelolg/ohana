import type { BoardNote, BoardRead } from './types';

/** `true` se la nota è ancora valida (non scaduta). */
export const noteActive = (n: BoardNote, now = new Date()): boolean =>
  !n.expires_at || new Date(n.expires_at) > now;

/** Spazio → istante dell'ultima apertura della bacheca. */
export const readAtBySpace = (reads: BoardRead[]): Map<string, string> =>
  new Map(reads.map((r) => [r.space_id, r.read_at]));

/**
 * Note da leggere: scritte da altri, ancora valide e più recenti dell'ultima apertura della bacheca di quello spazio.
 * Senza riga di lettura (spazio entrato dopo la migrazione) conta come mai aperta: tutte le note altrui sono nuove.
 */
export function unreadNotes(
  notes: BoardNote[],
  readAt: Map<string, string>,
  userId: string | undefined,
  now = new Date(),
): BoardNote[] {
  return notes.filter((n) => {
    const seen = readAt.get(n.space_id);
    return n.author_id !== userId && noteActive(n, now) && (!seen || n.created_at > seen);
  });
}
