import { useRef, useState } from 'react';

const TRIGGER_PX = 88;
const MAX_PULL_PX = 140;
const MIN_DRAG_PX = 10;

interface Args {
  enabled: boolean;
  /** Trascinato a destra oltre la soglia. */
  onRight: () => void;
  /** Trascinato a sinistra oltre la soglia. */
  onLeft: () => void;
}

/**
 * Gesto «swipe» su una riga: a destra = fatto, a sinistra = rimanda. Solo i trascinamenti orizzontali contano
 * (lo scorrimento verticale della pagina non deve far scattare nulla).
 */
export function useSwipe({ enabled, onRight, onLeft }: Args) {
  const [dx, setDx] = useState(0);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const dragged = useRef(false);

  return {
    dx,
    /** Il gesto è stato un trascinamento: il clic che segue non deve aprire la riga. */
    wasDragged: () => dragged.current,
    handlers: {
      onPointerDown: (e: React.PointerEvent) => {
        if (enabled) {
          origin.current = { x: e.clientX, y: e.clientY };
          dragged.current = false;
        }
      },
      onPointerMove: (e: React.PointerEvent) => {
        const o = origin.current;
        if (!o) {
          return;
        }
        const along = e.clientX - o.x;
        if (Math.abs(along) > MIN_DRAG_PX && Math.abs(along) > Math.abs(e.clientY - o.y)) {
          dragged.current = true;
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          setDx(Math.max(-MAX_PULL_PX, Math.min(MAX_PULL_PX, along)));
        }
      },
      onPointerUp: () => {
        if (!origin.current) {
          return;
        }
        origin.current = null;
        if (dx > TRIGGER_PX) {
          onRight();
        } else if (dx < -TRIGGER_PX) {
          onLeft();
        }
        setDx(0);
      },
    },
  };
}
