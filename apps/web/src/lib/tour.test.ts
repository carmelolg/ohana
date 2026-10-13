import { beforeEach, describe, expect, it } from 'vitest';
import { isTourDone, markTourDone } from './tour';

describe('guida iniziale', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    globalThis.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    } as unknown as Storage; // finto minimo: i test girano senza DOM
  });

  it('parte non vista e dopo markTourDone risulta vista', () => {
    expect(isTourDone()).toBe(false);
    markTourDone();
    expect(isTourDone()).toBe(true);
  });

  it('senza storage disponibile non lancia', () => {
    globalThis.localStorage = {
      getItem: () => {
        throw new Error('bloccato');
      },
      setItem: () => {
        throw new Error('bloccato');
      },
    } as unknown as Storage; // simula dati del sito bloccati
    expect(isTourDone()).toBe(false);
    expect(() => markTourDone()).not.toThrow();
  });
});
