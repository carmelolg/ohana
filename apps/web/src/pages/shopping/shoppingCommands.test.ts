import { describe, expect, it } from 'vitest';
import { fakeMutate } from '../../test-utils/fakeMutate';
import type { ShoppingItem, ShoppingList } from '../../lib/types';
import { addItems, clearChecked, toggleItem } from './shoppingCommands';

const list = { id: 'l1', space_id: 's1', name: 'Spesa' } as ShoppingList;
const item = (over: Partial<ShoppingItem>) =>
  ({
    id: 'i1',
    list_id: 'l1',
    text: 'Latte',
    qty: null,
    category: 'Latticini',
    checked: false,
    checked_by: null,
    checked_at: null,
    added_by: 'u',
    created_at: '',
    ...over,
  }) as ShoppingItem;

describe('shoppingCommands', () => {
  it('addItems: una voce per elemento con quantità e reparto, e aggiornamento ottimistico', async () => {
    const { mutate, calls, payloadAt } = fakeMutate();
    await addItems(mutate, list, 'latte, 2 pane, uova x6', 'u1');
    const rows = payloadAt<Record<string, unknown>[]>(0);
    expect(rows.map((r) => [r.text, r.qty, r.category])).toEqual([
      ['Latte', null, 'Latticini'],
      ['Pane', '2', 'Panetteria'],
      ['Uova', '6', 'Latticini'],
    ]);
    expect(rows.every((r) => r.list_id === 'l1' && r.added_by === 'u1')).toBe(true);
    const cache = calls[0].optimistic![0].patch([item({ id: 'old' })]) as ShoppingItem[];
    expect(cache).toHaveLength(4);
    expect(cache.slice(1).every((i) => i.checked === false)).toBe(true);
  });

  it('toggleItem: spunta con chi e quando, togli la spunta azzera tutto', async () => {
    const { mutate, payloadAt } = fakeMutate();
    await toggleItem(mutate, item({}), 'u1');
    await toggleItem(mutate, item({ checked: true, checked_by: 'u1', checked_at: 'x' }), 'u1');
    expect(payloadAt<Record<string, unknown>>(0)).toMatchObject({ checked: true, checked_by: 'u1' });
    expect(payloadAt<Record<string, unknown>>(1)).toEqual({
      checked: false,
      checked_by: null,
      checked_at: null,
    });
  });

  it('clearChecked: una cancellazione per voce nel carrello', async () => {
    const { mutate, steps } = fakeMutate();
    await clearChecked(mutate, [item({ id: 'a', checked: true }), item({ id: 'b', checked: true })]);
    expect(steps()).toEqual(['delete:shopping_items', 'delete:shopping_items']);
  });
});
