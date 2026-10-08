import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth';
import { flushOutbox } from '../outbox';
import { supabase } from '../supabase';
import { REALTIME_TABLES, TABLE_KEYS } from './invalidation';

/** Aggiorna le query quando il database cambia e svuota la coda offline appena torna la rete. */
export function useRealtimeSync() {
  const qc = useQueryClient();
  const { session } = useAuth();
  useEffect(() => {
    if (!session) {
      return;
    }
    const channel = supabase.channel(`db-changes-${crypto.randomUUID()}`); // nome unico: evita conflitti join/leave (StrictMode)
    for (const table of REALTIME_TABLES) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        for (const k of TABLE_KEYS[table]) {
          void qc.invalidateQueries({ queryKey: [k] });
        }
      });
    }
    channel.subscribe((status, err) => {
      if (status !== 'SUBSCRIBED') {
        console.warn('[realtime]', status, err?.message ?? '');
      } else {
        console.info('[realtime] SUBSCRIBED');
      }
    });
    const syncOutbox = async () => {
      if ((await flushOutbox()) > 0) {
        void qc.invalidateQueries();
      }
    };
    window.addEventListener('online', syncOutbox);
    void syncOutbox();
    return () => {
      window.removeEventListener('online', syncOutbox);
      void supabase.removeChannel(channel);
    };
  }, [session, qc]);
}

/** Presenza: chi sta guardando una certa vista in uno spazio. */
export function usePresence(spaceId: string | undefined, where: string) {
  const { session, profile } = useAuth();
  const [others, setOthers] = useState<string[]>([]);
  useEffect(() => {
    if (!session || !spaceId || !profile) {
      return;
    }
    const channel = supabase.channel(`presence:${spaceId}`, {
      config: { presence: { key: session.user.id } },
    });
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState() as Record<string, { name: string; where: string }[]>;
      setOthers(
        Object.entries(state)
          .filter(([uid, v]) => uid !== session.user.id && v.some((x) => x.where === where))
          .map(([, v]) => v[0].name),
      );
    });
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        void channel.track({ name: profile.first_name || 'Qualcuno', where });
      }
    });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [session, spaceId, where, profile]);
  return others;
}
