import { describe, expect, it } from 'vitest';
import { parseQuick } from '@ohana/shared';
import { understoodChips } from './understood';

const names = { spaces: [{ id: 's1', name: 'Casa' }], members: [{ id: 'u1', name: 'Francesca' }] };
const now = new Date('2026-10-12T08:00:00Z');

describe('understoodChips', () => {
  it('vuoto senza testo', () => {
    expect(understoodChips(null, names)).toEqual([]);
  });
  it('mostra ripetizione e persona riconosciute', () => {
    const parsed = parseQuick('plastica ogni giovedì @Francesca', now, names);
    const keys = understoodChips(parsed, names).map((c) => c.k);
    expect(keys).toContain('Ripete');
    expect(keys).toContain('Per');
  });
});
