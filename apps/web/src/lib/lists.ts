// Operazioni immutabili sugli elenchi dello stato di React.

/** Sposta l'elemento `index` di `delta` posizioni (negativo = su). Fuori dai limiti restituisce l'elenco invariato. */
export function moveItem<T>(items: T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (target < 0 || target >= items.length) {
    return items;
  }
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export const updateItem = <T>(items: T[], index: number, patch: Partial<T>): T[] =>
  items.map((item, i) => (i === index ? { ...item, ...patch } : item));

export const removeItem = <T>(items: T[], index: number): T[] => items.filter((_, i) => i !== index);
