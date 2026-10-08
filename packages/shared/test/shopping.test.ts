import { describe, expect, it } from 'vitest';
import { categorizeItem, parseShoppingInput } from '../src';

describe('spesa', () => {
  it('aggiunta multipla con quantità e categorie', () => {
    const r = parseShoppingInput('latte, 2 pane, uova x6, detersivo piatti');
    expect(r).toEqual([
      { text: 'Latte', qty: null, category: 'Latticini' },
      { text: 'Pane', qty: '2', category: 'Panetteria' },
      { text: 'Uova', qty: '6', category: 'Latticini' },
      { text: 'Detersivo piatti', qty: null, category: 'Casa e igiene' },
    ]);
  });
  it('sconosciuto -> Altro', () => expect(categorizeItem('xyz')).toBe('Altro'));
});
