import { useEffect, type RefObject } from 'react';

/** Chiude un popover con Esc o toccando fuori dal suo contenitore (che include il pulsante che lo apre). */
export function useDismiss(open: boolean, wrap: RefObject<HTMLElement | null>, close: () => void) {
  useEffect(() => {
    if (!open) {
      return;
    }
    const away = (e: PointerEvent) => !wrap.current?.contains(e.target as Node) && close();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
      }
    };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', key);
    };
  }, [open, wrap, close]);
}
