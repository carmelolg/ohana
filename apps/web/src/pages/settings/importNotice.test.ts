import { describe, expect, it } from 'vitest';
import { importVisibilityNote } from './importNotice';

describe('importVisibilityNote', () => {
  it('spazio con altre persone: dice chi vedrà gli impegni', () => {
    expect(importVisibilityNote('Casa', 2)).toBe(
      'Gli impegni importati saranno visibili all’altra persona dello spazio «Casa», non solo a te.',
    );
    expect(importVisibilityNote('Casa', 4)).toContain('alle altre 3 persone');
  });
  it('spazio personale: nessun avviso', () => {
    expect(importVisibilityNote('Casa mia', 1)).toBeNull();
    expect(importVisibilityNote('Casa mia', 0)).toBeNull();
  });
});
