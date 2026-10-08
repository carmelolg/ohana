import type { Mutate } from '../data';
import type { Category } from '../types';

/** Aggiornamento ottimistico della lista delle categorie in cache. */
const patchCategories = (fn: (rows: { id: string }[]) => unknown[]) => [
  { key: ['categories'], patch: (old: unknown) => fn((old as { id: string }[]) ?? []) },
];

export interface NewCategory {
  id: string;
  spaceId: string;
  name: string;
  keywords?: string[];
  /** posizione in elenco: in fondo */
  position: number;
}

/** Crea una categoria personalizzata (senza parole chiave: si aggiungono dalle impostazioni dello spazio). */
export function createCategory(mutate: Mutate, { id, spaceId, name, keywords = [], position }: NewCategory) {
  const row = { id, space_id: spaceId, name, keywords, position };
  return mutate(
    { table: 'categories', action: 'upsert', payload: row },
    patchCategories((rows) => [...rows, { ...row, slug: null }]),
  );
}

/** Elimina una categoria personalizzata: il database sposta i suoi impegni in «Altro». */
export function deleteCategory(mutate: Mutate, id: string) {
  return mutate(
    { table: 'categories', action: 'delete', match: { id } },
    patchCategories((rows) => rows.filter((c) => c.id !== id)),
  );
}

export interface FeedbackToRecord {
  id: string;
  spaceId: string;
  userId: string;
  /** titolo dell'impegno: viene troncato a 200 caratteri */
  text: string;
  label: string;
  corrected: boolean;
}

/** Rinomina una categoria o ne cambia le parole chiave (l'aggiornamento si vede subito in cache). */
export function updateCategory(
  mutate: Mutate,
  id: string,
  patch: Partial<Pick<Category, 'name' | 'keywords'>>,
) {
  return mutate({ table: 'categories', action: 'update', payload: patch, match: { id } }, [
    {
      key: ['categories'],
      patch: (old: unknown) => ((old as Category[]) ?? []).map((c) => (c.id === id ? { ...c, ...patch } : c)),
    },
  ]);
}

/** Registra un esempio (correzione o conferma) per il modello delle categorie dello spazio. */
export function recordCategoryFeedback(mutate: Mutate, f: FeedbackToRecord) {
  return mutate({
    table: 'category_feedback',
    action: 'upsert',
    payload: {
      id: f.id,
      space_id: f.spaceId,
      user_id: f.userId,
      text: f.text.slice(0, 200),
      label: f.label,
      corrected: f.corrected,
    },
  });
}
