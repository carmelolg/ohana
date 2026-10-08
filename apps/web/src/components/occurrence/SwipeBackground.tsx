const FILL = { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' } as const;

/** Sfondo che si scopre sotto la riga trascinata: verde «fatto» a destra, ocra «rimanda» a sinistra. */
export function SwipeBackground({ dx }: { dx: number }) {
  return (
    <div className="swipe-bg" aria-hidden>
      <span
        className="l"
        style={{ ...FILL, background: 'oklch(0.55 0.12 150)', paddingLeft: 16, opacity: dx > 0 ? 1 : 0 }}
      >
        ✓ Fatto
      </span>
      <span
        className="r"
        style={{
          ...FILL,
          background: 'oklch(0.55 0.12 85)',
          justifyContent: 'flex-end',
          paddingRight: 16,
          opacity: dx < 0 ? 1 : 0,
        }}
      >
        Rimanda ⏱
      </span>
    </div>
  );
}
