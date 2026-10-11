import { useMemo } from 'react';
import { supabase } from '../supabase';
import { noteActive, readAtBySpace, unreadNotes } from '../boardUnread';
import type { BoardNote, BoardRead } from '../types';
import { useAuth } from '../auth';
import { useAuthedQuery } from './query';
import { useSpace } from './spaces';

export const useBoardNotes = () =>
  useAuthedQuery<BoardNote[]>(['board'], () =>
    supabase.from('board_notes').select('*').order('created_at', { ascending: false }),
  );

/** Le righe «letto fino a» dell'utente: RLS lascia passare solo le sue. */
export const useBoardReads = () =>
  useAuthedQuery<BoardRead[]>(['board-reads'], () =>
    supabase.from('board_reads').select('space_id, read_at'),
  );

export interface BoardOverview {
  /** Note degli spazi selezionati, già filtrate, dalla più recente. */
  notes: BoardNote[];
  /** Quelle ancora valide. */
  active: BoardNote[];
  /** Quelle di altri scritte dopo l'ultima apertura della bacheca. */
  unread: BoardNote[];
  /** Ultima apertura per spazio, per evidenziare le nuove anche dopo averle segnate come lette. */
  readAt: Map<string, string>;
  /** `false` finché non sono arrivate note e letture: evita un badge che compare e sparisce. */
  ready: boolean;
}

/** Bacheca degli spazi in vista (quello scelto, o tutti): note, nuove da leggere e ultima apertura. */
export function useBoardOverview(): BoardOverview {
  const { session } = useAuth();
  const { selected } = useSpace();
  const board = useBoardNotes();
  const reads = useBoardReads();
  const userId = session?.user.id;
  return useMemo(() => {
    const notes = (board.data ?? []).filter((n) => selected === 'all' || n.space_id === selected);
    const readAt = readAtBySpace(reads.data ?? []);
    const ready = board.isSuccess && reads.isSuccess;
    return {
      notes,
      active: notes.filter((n) => noteActive(n)),
      unread: ready ? unreadNotes(notes, readAt, userId) : [],
      readAt,
      ready,
    };
  }, [board.data, board.isSuccess, reads.data, reads.isSuccess, selected, userId]);
}
