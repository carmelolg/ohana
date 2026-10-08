/** Funzioni che ogni spazio può spegnere (le altre, come impegni e bacheca, ci sono sempre). */
export const SPACE_FEATURES = [
  { key: 'spesa', label: 'Lista della spesa', hint: 'Liste condivise da comprare' },
  { key: 'spese', label: 'Spese e saldi', hint: 'Spese da dividere tra le persone' },
  { key: 'manutenzioni', label: 'Manutenzioni', hint: 'Caldaia, gomme, revisioni' },
  { key: 'pratiche', label: 'Pratiche', hint: 'ISEE, 730, rinnovi con passaggi' },
  { key: 'documenti', label: 'Documenti', hint: 'Archivio e scansione di bollette e referti' },
] as const;

export type SpaceFeature = (typeof SPACE_FEATURES)[number]['key'];

export const FEATURE_KEYS: SpaceFeature[] = SPACE_FEATURES.map((f) => f.key);

interface WithDisabled {
  disabled_features?: string[] | null;
}

/** Una funzione è accesa per un singolo spazio se non è nell'elenco di quelle spente. */
export const featureOnIn = (space: WithDisabled, feature: SpaceFeature): boolean =>
  !space.disabled_features?.includes(feature);

/**
 * Una funzione è accesa in una vista se lo è in almeno uno degli spazi che la compongono
 * («Tutti gli spazi» = tutti). Senza spazi (ancora in caricamento) resta accesa, per non far lampeggiare i menu.
 */
export const featureOn = (spaces: WithDisabled[], feature: SpaceFeature): boolean =>
  spaces.length === 0 || spaces.some((s) => featureOnIn(s, feature));

/** Nuovo elenco di funzioni spente dopo aver acceso o spento `feature`. */
export function toggleFeature(disabled: string[], feature: SpaceFeature, on: boolean): string[] {
  const rest = disabled.filter((f) => f !== feature);
  return on ? rest : [...rest, feature];
}
