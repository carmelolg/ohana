import { describe, expect, it } from 'vitest';
import { buildThread, initialThreadForm, nextHue, threadFormError } from './threadForm';

describe('modulo del filone', () => {
  it('ogni filone nuovo prende un colore non ancora usato', () => {
    const first = nextHue([]);
    const second = nextHue([first]);
    expect(second).not.toBe(first);
    expect([first, second]).not.toContain(initialThreadForm(null, [first, second]).colorHue);
  });

  it('finiti i colori si ricomincia', () => {
    const all = Array.from({ length: 20 }, (_, i) => i);
    expect(typeof nextHue(all)).toBe('number');
  });

  it('serve almeno il nome', () => {
    const f = initialThreadForm(null, []);
    expect(threadFormError(f)).toMatch(/nome/);
    expect(threadFormError({ ...f, title: 'Tachicardia' })).toBeNull();
  });

  it('i campi vuoti diventano nulli', () => {
    const f = { ...initialThreadForm(null, []), title: ' Tachicardia ', trackedParams: ['heart_rate'] };
    expect(buildThread(f, { id: 't1', spaceId: 's1', recipientId: 'r1' })).toMatchObject({
      title: ' Tachicardia ',
      contactId: null,
      startedAt: null,
      trackedParams: ['heart_rate'],
    });
  });
});
