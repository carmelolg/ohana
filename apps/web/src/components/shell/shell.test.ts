import { describe, expect, it } from 'vitest';
import { isFullScreenFlow } from './isFullScreenFlow';

describe('navigazione', () => {
  it('flussi a schermo intero', () => {
    expect(isFullScreenFlow('/nuovo')).toBe(true);
    expect(isFullScreenFlow('/evento/1')).toBe(true);
    expect(isFullScreenFlow('/scansiona')).toBe(true);
    expect(isFullScreenFlow('/cura/visita/ev1')).toBe(true);
    expect(isFullScreenFlow('/cura/abc')).toBe(false);
    expect(isFullScreenFlow('/oggi')).toBe(false);
  });
});
