import type { Mutate } from '../data';

/** Fissa o toglie dall'alto una nota della bacheca. */
export const setNotePinned = (mutate: Mutate, id: string, pinned: boolean) =>
  mutate({ table: 'board_notes', action: 'update', payload: { pinned }, match: { id } });

export const deleteNote = (mutate: Mutate, id: string) =>
  mutate({ table: 'board_notes', action: 'delete', match: { id } });

export interface NewNote {
  id: string;
  spaceId: string;
  authorId: string;
  text: string;
  expiresAt: Date | null;
  /** Avvisa gli altri membri con una notifica push (decide l'autore). */
  notifyPush: boolean;
}

/** Pubblica una nota fissata in cima alla bacheca. */
export const publishNote = (mutate: Mutate, n: NewNote) =>
  mutate({
    table: 'board_notes',
    action: 'upsert',
    payload: {
      id: n.id,
      space_id: n.spaceId,
      author_id: n.authorId,
      text: n.text,
      pinned: true,
      expires_at: n.expiresAt ? n.expiresAt.toISOString() : null,
      notify_push: n.notifyPush,
    },
  });

/** Segna la bacheca di questi spazi come letta adesso (una riga per utente e spazio, `user_id` lo mette il database). */
export const markBoardRead = (mutate: Mutate, spaceIds: string[], now: Date) =>
  mutate({
    table: 'board_reads',
    action: 'upsert',
    payload: spaceIds.map((space_id) => ({ space_id, read_at: now.toISOString() })),
    onConflict: 'space_id,user_id',
  });
