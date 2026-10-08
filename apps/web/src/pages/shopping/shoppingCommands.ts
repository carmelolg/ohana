import { parseShoppingInput } from '@ohana/shared';
import type { Mutate, OptimisticUpdate } from '../../lib/data';
import { newId } from '../../lib/outbox';
import type { ShoppingItem, ShoppingList } from '../../lib/types';

const itemsCache = (change: (items: ShoppingItem[]) => ShoppingItem[]): OptimisticUpdate[] => [
  { key: ['shopping', 'items'], patch: (old: unknown) => change((old as ShoppingItem[]) ?? []) },
];

/** «latte, 2 pane, uova x6» → una voce per elemento, con quantità e reparto. */
export async function addItems(
  mutate: Mutate,
  list: ShoppingList,
  input: string,
  userId: string,
): Promise<void> {
  const rows = parseShoppingInput(input).map((p) => ({
    id: newId(),
    list_id: list.id,
    text: p.text,
    qty: p.qty,
    category: p.category,
    added_by: userId,
  }));
  const createdAt = new Date().toISOString();
  await mutate(
    { table: 'shopping_items', action: 'upsert', payload: rows },
    itemsCache((items) => [
      ...items,
      ...rows.map((r) => ({
        ...r,
        checked: false,
        checked_by: null,
        checked_at: null,
        created_at: createdAt,
      })),
    ]),
  );
}

export async function toggleItem(mutate: Mutate, item: ShoppingItem, userId: string): Promise<void> {
  const changes = item.checked
    ? { checked: false, checked_by: null, checked_at: null }
    : { checked: true, checked_by: userId, checked_at: new Date().toISOString() };
  await mutate(
    { table: 'shopping_items', action: 'update', payload: changes, match: { id: item.id } },
    itemsCache((items) => items.map((x) => (x.id === item.id ? { ...x, ...changes } : x))),
  );
}

/** Toglie dalla lista le voci già nel carrello. */
export async function clearChecked(mutate: Mutate, checked: ShoppingItem[]): Promise<void> {
  const ids = checked.map((i) => i.id);
  for (const id of ids) {
    await mutate(
      { table: 'shopping_items', action: 'delete', match: { id } },
      itemsCache((items) => items.filter((x) => !ids.includes(x.id))),
    );
  }
}

/** Crea la lista e ne restituisce l'id. */
export async function createList(mutate: Mutate, spaceId: string, name: string): Promise<string> {
  const id = newId();
  await mutate({ table: 'shopping_lists', action: 'upsert', payload: { id, space_id: spaceId, name } }, [
    {
      key: ['shopping', 'lists'],
      patch: (old: unknown) => [...((old as ShoppingList[]) ?? []), { id, space_id: spaceId, name }],
    },
  ]);
  return id;
}

export async function deleteList(mutate: Mutate, list: ShoppingList): Promise<void> {
  await mutate({ table: 'shopping_lists', action: 'delete', match: { id: list.id } });
}
