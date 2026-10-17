import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { SpaceRole } from '@ohana/shared';
import { useAuth } from '../auth';
import { fullName } from '../color';
import { loadSelectedSpace, saveSelectedSpace } from '../preferences';
import { supabase } from '../supabase';
import type { Member, Space } from '../types';
import { useAuthedQuery } from './query';

const WRITER_ROLES: SpaceRole[] = ['owner', 'admin', 'member'];

export function useSpaces() {
  const query = useAuthedQuery<Space[]>(['spaces'], () =>
    supabase
      .from('spaces')
      .select('*, space_members(user_id, role, profiles(id, first_name, last_name, nickname, avatar_url))')
      .order('created_at'),
  );
  return query;
}

interface SpaceCtx {
  spaces: Space[];
  loading: boolean;
  /** La lettura è fallita e non c'è nulla in cache: «nessuno spazio» qui non significa account nuovo. */
  failed: boolean;
  retry: () => void;
  selected: string; // id dello spazio attivo ('all' solo se l'utente non ha spazi)
  setSelected: (id: string) => void;
  current: Space | null; // null solo se l'utente non ha spazi
  /** Spazio di default per nuove voci */
  defaultSpace: Space | null;
  memberName: (id: string | null | undefined) => string;
  memberProfile: (id: string | null | undefined) => Member['profiles'] | undefined;
  spaceById: (id: string) => Space | undefined;
  myRole: (spaceId: string) => SpaceRole | undefined;
  canWrite: (spaceId: string | undefined) => boolean;
}
const Ctx = createContext<SpaceCtx | null>(null);

export function useSpace(): SpaceCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error('useSpace va usato dentro <SpaceProvider>');
  }
  return ctx;
}

export function SpaceProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const { data: spaces = [], isPending, isError, refetch } = useSpaces();
  const [selected, setSel] = useState(loadSelectedSpace);
  const uid = session?.user.id;

  const value = useMemo<SpaceCtx>(() => {
    // si vede sempre uno spazio solo: una scelta salvata «tutti» o non più valida ricade sul primo spazio
    const current = spaces.find((s) => s.id === selected) ?? spaces[0] ?? null;
    const sel = current?.id ?? 'all';
    const names = new Map<string, string>();
    const profiles = new Map<string, Member['profiles']>();
    for (const s of spaces) {
      for (const m of s.space_members) {
        names.set(m.user_id, fullName(m.profiles) || 'Utente');
        profiles.set(m.user_id, m.profiles);
      }
    }
    const spaceById = (id: string) => spaces.find((s) => s.id === id);
    const myRole = (id: string) => spaceById(id)?.space_members.find((m) => m.user_id === uid)?.role;
    return {
      spaces,
      // isPending (non isLoading): resta vero anche mentre la richiesta è in pausa o non è ancora partita
      loading: isPending && spaces.length === 0,
      failed: isError && spaces.length === 0,
      retry: () => void refetch(),
      selected: sel,
      setSelected: (id) => {
        setSel(id);
        saveSelectedSpace(id);
      },
      current,
      defaultSpace: current ?? spaces[0] ?? null,
      memberName: (id) => (id ? (names.get(id) ?? '') : ''),
      memberProfile: (id) => (id ? profiles.get(id) : undefined),
      spaceById,
      myRole,
      canWrite: (id) => !!id && WRITER_ROLES.includes(myRole(id) as SpaceRole),
    };
  }, [spaces, isPending, isError, refetch, selected, uid]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
