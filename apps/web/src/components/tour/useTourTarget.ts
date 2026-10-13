import { useEffect, useState } from 'react';
import type { Box } from './placement';

const POLL_MS = 200;

interface Found {
  el: HTMLElement;
  box: Box;
}

const isVisible = (el: Element): boolean => {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
};

const boxOf = (el: Element): Box => {
  const { top, left, width, height } = el.getBoundingClientRect();
  return { top, left, width, height };
};

const sameBox = (a: Box, b: Box) =>
  a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height;

/** Primo elemento visibile tra i selettori (barra inferiore su mobile, laterale su desktop). */
function findVisible(selectors: string[]): HTMLElement | null {
  for (const selector of selectors) {
    const hit = [...document.querySelectorAll<HTMLElement>(selector)].find(isVisible);
    if (hit) {
      return hit;
    }
  }
  return null;
}

/**
 * Cerca l'elemento da evidenziare e ne segue la posizione. Controlla a intervalli perché la pagina del passo
 * può caricarsi dopo (lazy), i dati arrivare in ritardo o il layout cambiare (scorrimento, rotazione).
 */
export function useTourTarget(selectors: string[] | undefined, stepId: string): Found | null {
  const [found, setFound] = useState<Found | null>(null);

  useEffect(() => {
    setFound(null);
    if (!selectors) {
      return;
    }
    let current: HTMLElement | null = null;
    const tick = () => {
      const el = findVisible(selectors);
      if (!el) {
        current = null;
        setFound(null);
        return;
      }
      if (el !== current) {
        current = el;
        el.scrollIntoView({ block: 'center', inline: 'nearest' });
      }
      const box = boxOf(el);
      setFound((prev) => (prev && prev.el === el && sameBox(prev.box, box) ? prev : { el, box }));
    };
    tick();
    const timer = window.setInterval(tick, POLL_MS);
    return () => window.clearInterval(timer);
    // `selectors` è una costante del passo: la chiave del passo basta a riavviare la ricerca
  }, [stepId]); // eslint-disable-line react-hooks/exhaustive-deps

  return found;
}
