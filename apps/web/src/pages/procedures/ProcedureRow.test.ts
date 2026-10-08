import { describe, expect, it } from 'vitest';
import { progressPercent } from './ProcedureRow';

describe('avanzamento', () => {
  it('percentuale, anche senza passaggi', () => {
    expect(progressPercent(1, 4)).toBe(25);
    expect(progressPercent(0, 0)).toBe(0);
    expect(progressPercent(3, 3)).toBe(100);
  });
});
