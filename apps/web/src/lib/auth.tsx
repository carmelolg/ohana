import { toPalette, type Palette } from '@ohana/shared';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import { clearSnapshot } from './emergency-cache';
import { readJson, writeJson } from './storage';
import { applyPaletteVars } from './palette';
import type { Profile } from './types';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}
const Ctx = createContext<AuthState>(null as never);
export const useAuth = () => useContext(Ctx);

const THEME_KEY = 'ohana-theme';

/** Applica tema e accento al documento e li ricorda, così alla riapertura non c'è un lampo del tema sbagliato. */
export function applyTheme(theme: string, accent: string, palette: Palette) {
  const dark = theme === 'dark' || (theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  const root = document.documentElement;
  root.dataset.theme = dark ? 'dark' : 'light';
  root.dataset.accent = accent;
  const colors = applyPaletteVars(palette, dark);
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', colors.bg);
  writeJson(THEME_KEY, { theme, accent, palette });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (uid: string | undefined) => {
    if (!uid) {
      return setProfile(null);
    }
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    if (data) {
      // La colonna può mancare (database non ancora migrato) o avere un valore sconosciuto: si ricade sul predefinito
      // invece di lasciare l'app su «Caricamento…».
      const loaded = { ...(data as Profile), palette: toPalette(data.palette) };
      setProfile(loaded);
      applyTheme(loaded.theme, loaded.accent, loaded.palette);
    }
  }, []);

  useEffect(() => {
    const saved = readJson<{ theme: string; accent: string; palette?: unknown }>(THEME_KEY);
    if (saved) {
      applyTheme(saved.theme, saved.accent, toPalette(saved.palette));
    }
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await load(data.session?.user.id);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      void load(s?.user.id);
      if (!s) {
        qc.clear();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [load, qc]);

  useEffect(() => {
    if (profile?.theme !== 'auto') {
      return;
    }
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const fn = () => applyTheme('auto', profile.accent, profile.palette);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, [profile?.theme, profile?.accent, profile?.palette]);

  return (
    <Ctx.Provider
      value={{
        session,
        profile,
        loading,
        refreshProfile: () => load(session?.user.id),
        signOut: async () => {
          await clearSnapshot();
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
