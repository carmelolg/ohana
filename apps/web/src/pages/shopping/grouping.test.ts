import { describe, expect, it } from 'vitest';
import type { ShoppingItem } from '../../lib/types';
import { groupByCategory } from './grouping';

const item = (id: string, category: string | null) => ({ id, category }) as ShoppingItem;

describe('spesa per reparto', () => {
  it('senza reparto finisce in «Altro», i reparti vuoti spariscono', () => {
    const groups = groupByCategory([item('1', null), item('2', 'Altro')]);
    expect(groups).toHaveLength(1);
    expect(groups[0][0]).toBe('Altro');
    expect(groups[0][1].map((i) => i.id)).toEqual(['1', '2']);
  });
  it('nessuna voce, nessun gruppo', () => {
    expect(groupByCategory([])).toEqual([]);
  });
});
