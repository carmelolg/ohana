import { SHOPPING_CATEGORIES } from '@ohana/shared';
import type { ShoppingItem } from '../../lib/types';

/** Voci da comprare raggruppate per reparto (nell'ordine fisso dei reparti), senza reparti vuoti. */
export function groupByCategory(todo: ShoppingItem[]): (readonly [string, ShoppingItem[]])[] {
  return SHOPPING_CATEGORIES.map(
    (category) => [category, todo.filter((i) => (i.category ?? 'Altro') === category)] as const,
  ).filter(([, rows]) => rows.length);
}
