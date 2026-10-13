/**
 * Campi di un impegno importato che l'utente può cambiare in Ohana: la sincronizzazione non li riscrive finché sono in
 * `events.local_overrides`. Titolo e orario restano del calendario d'origine (nessuna divergenza da riconciliare).
 */
export const IMPORT_OVERRIDABLE = ['location', 'notes'] as const;
export type ImportOverridable = (typeof IMPORT_OVERRIDABLE)[number];

type Values = Record<ImportOverridable, string | null>;

const isOverridable = (field: string): field is ImportOverridable =>
  (IMPORT_OVERRIDABLE as readonly string[]).includes(field);

/** I campi da tenere come «cambiati a mano» dopo un salvataggio: quelli già tali, più quelli che ora differiscono. */
export function overridesAfterEdit(
  current: readonly string[],
  saved: Values,
  edited: Values,
): ImportOverridable[] {
  const kept = current.filter(isOverridable);
  const changed = IMPORT_OVERRIDABLE.filter((f) => (saved[f] ?? null) !== (edited[f] ?? null));
  return IMPORT_OVERRIDABLE.filter((f) => kept.includes(f) || changed.includes(f));
}
