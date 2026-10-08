import { describe, expect, it } from 'vitest';
import { isFullScreenFlow } from './isFullScreenFlow';
import { isInMore } from './TabBar';

describe('navigazione', () => {
  it('«Altro» è attivo nelle pagine che contiene', () => {
    expect(isInMore('/altro')).toBe(true);
    expect(isInMore('/rubrica')).toBe(true);
    expect(isInMore('/spazio/abc')).toBe(true);
    expect(isInMore('/oggi')).toBe(false);
    expect(isInMore('/spesa')).toBe(false);
  });
  it('flussi a schermo intero', () => {
    expect(isFullScreenFlow('/nuovo')).toBe(true);
    expect(isFullScreenFlow('/evento/1')).toBe(true);
    expect(isFullScreenFlow('/scansiona')).toBe(true);
    expect(isFullScreenFlow('/oggi')).toBe(false);
  });
});
