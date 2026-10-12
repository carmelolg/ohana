import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { readJson, writeJson } from '../../lib/storage';
import { areaOf } from './areas';

const KEY = 'ohana-side-open';

/**
 * Quali gruppi della barra laterale sono aperti (per `to` della testata). Partono tutti chiusi: sul dispositivo resta
 * solo ciò che l'utente apre o chiude a mano. Il gruppo dell'area corrente si mostra aperto senza salvarlo, così la
 * voce attiva non resta nascosta ma non diventa «aperto per sempre».
 */
export function useSideOpen() {
  const [open, setOpen] = useState<string[]>(() => readJson<string[]>(KEY) ?? []);
  const { pathname } = useLocation();
  const area = areaOf(pathname);
  const areaTo = area ? `/${area}` : null;
  // gruppi chiusi a mano mentre si è nella loro area: la scelta esplicita vince sull'apertura automatica
  const [closedHere, setClosedHere] = useState<string | null>(null);

  useEffect(() => {
    setClosedHere(null);
  }, [areaTo]);

  const set = useCallback((to: string, value: boolean) => {
    setOpen((prev) => {
      const next = value ? [...prev.filter((t) => t !== to), to] : prev.filter((t) => t !== to);
      writeJson(KEY, next);
      return next;
    });
  }, []);

  const isOpen = (to: string) => open.includes(to) || (to === areaTo && closedHere !== to);
  const toggle = (to: string) => {
    const wasOpen = isOpen(to);
    set(to, !wasOpen);
    setClosedHere(wasOpen ? to : null);
  };
  return { isOpen, toggle };
}
