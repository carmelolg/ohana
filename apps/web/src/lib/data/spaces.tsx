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
  selected: string; // 'all' oppure id
  setSelected: (id: string) => void;
  current: Space | null; // null se "Tutti"
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
  const { data: spaces = [], isLoading } = useSpaces();
  const [selected, setSel] = useState(loadSelectedSpace);
  const uid = session?.user.id;

  const value = useMemo<SpaceCtx>(() => {
    const valid = selected === 'all' || spaces.some((s) => s.id === selected);
    const sel = valid ? selected : 'all';
    const current = sel === 'all' ? null : (spaces.find((s) => s.id === sel) ?? null);
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
      loading: isLoading && spaces.length === 0,
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
  }, [spaces, isLoading, selected, uid]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
