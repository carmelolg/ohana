import { describe, expect, it } from 'vitest';
import { holeClip, placePopover } from './placement';

const vp = { width: 400, height: 800 };

describe('placePopover', () => {
  it('senza elemento centra il fumetto', () => {
    const p = placePopover(null, vp);
    expect(p.top).toBeUndefined();
    expect(p.bottom).toBeUndefined();
    expect(p.left * 2 + p.width).toBe(vp.width);
  });

  it('elemento in alto: fumetto sotto', () => {
    const p = placePopover({ top: 20, left: 10, width: 100, height: 40 }, vp);
    expect(p.top).toBeGreaterThan(60);
    expect(p.bottom).toBeUndefined();
  });

  it('elemento in basso (barra inferiore): fumetto sopra', () => {
    const p = placePopover({ top: 740, left: 10, width: 80, height: 50 }, vp);
    expect(p.bottom).toBeGreaterThan(60);
    expect(p.top).toBeUndefined();
  });

  it('il fumetto non esce dallo schermo a destra', () => {
    const p = placePopover({ top: 100, left: 380, width: 20, height: 20 }, vp);
    expect(p.left + p.width).toBeLessThanOrEqual(vp.width);
  });
});

describe('holeClip', () => {
  it('produce un poligono evenodd con il buco attorno all’elemento', () => {
    const clip = holeClip({ top: 100, left: 50, width: 100, height: 40 }, vp);
    expect(clip.startsWith('polygon(evenodd,')).toBe(true);
    expect(clip).toContain('44px 94px');
    expect(clip).toContain('156px 146px');
  });
});
