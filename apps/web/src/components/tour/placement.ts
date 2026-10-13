export interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface Placement {
  /** Posizione del fumetto: ancorata in alto o in basso, mai fuori schermo. Senza ancoraggio il fumetto è centrato. */
  top?: number;
  bottom?: number;
  left: number;
  width: number;
}

export const SPOT_PAD = 6;
const MARGIN = 12;
const GAP = 14;
const MAX_WIDTH = 380;

/** Dove mettere il fumetto rispetto all'elemento evidenziato: sotto se c'è più spazio sotto, altrimenti sopra. */
export function placePopover(target: Box | null, viewport: { width: number; height: number }): Placement {
  const width = Math.min(MAX_WIDTH, viewport.width - MARGIN * 2);
  if (!target) {
    return { left: (viewport.width - width) / 2, width };
  }
  const centerX = target.left + target.width / 2;
  const left = Math.min(Math.max(centerX - width / 2, MARGIN), viewport.width - width - MARGIN);
  const below = viewport.height - (target.top + target.height);
  const above = target.top;
  if (below >= above) {
    return { left, width, top: target.top + target.height + SPOT_PAD + GAP };
  }
  return { left, width, bottom: viewport.height - target.top + SPOT_PAD + GAP };
}

/** Ritaglio CSS «tutto lo schermo meno un buco»: i tocchi nel buco arrivano all'elemento vero. */
export function holeClip(target: Box, viewport: { width: number; height: number }): string {
  const x1 = Math.max(target.left - SPOT_PAD, 0);
  const y1 = Math.max(target.top - SPOT_PAD, 0);
  const x2 = Math.min(target.left + target.width + SPOT_PAD, viewport.width);
  const y2 = Math.min(target.top + target.height + SPOT_PAD, viewport.height);
  const outer = `0 0, ${viewport.width}px 0, ${viewport.width}px ${viewport.height}px, 0 ${viewport.height}px, 0 0`;
  const hole = `${x1}px ${y1}px, ${x1}px ${y2}px, ${x2}px ${y2}px, ${x2}px ${y1}px, ${x1}px ${y1}px`;
  return `polygon(evenodd, ${outer}, ${hole})`;
}
