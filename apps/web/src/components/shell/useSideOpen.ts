import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { readJson, writeJson } from '../../lib/storage';
import { areaOf } from './areas';

const KEY = 'ohana-side-open';

/**
 * Quali gruppi della barra laterale sono aperti (per `to` della testata). Partono tutti chiusi;
 * entrando in un'area il suo gruppo si apre, così la voce attiva non resta nascosta. La scelta resta sul dispositivo.
 */
export function useSideOpen() {
  const [open, setOpen] = useState<string[]>(() => readJson<string[]>(KEY) ?? []);
  const { pathname } = useLocation();
  const area = areaOf(pathname);

  const set = useCallback((to: string, value: boolean) => {
    setOpen((prev) => {
      if (prev.includes(to) === value) {
        return prev;
      }
      const next = value ? [...prev, to] : prev.filter((t) => t !== to);
      writeJson(KEY, next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (area) {
      set(`/${area}`, true);
    }
  }, [area, set]);

  return { isOpen: (to: string) => open.includes(to), toggle: (to: string) => set(to, !open.includes(to)) };
}
