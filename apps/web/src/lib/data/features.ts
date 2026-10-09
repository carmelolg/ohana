import { featureOnForRoles, type SpaceFeature } from '@ohana/shared';
import { useSpace } from './spaces';

/** La funzione è attiva nella vista corrente (lo spazio scelto, o almeno uno tra tutti gli spazi)? */
export function useFeature(feature: SpaceFeature): boolean {
  return useFeatures()(feature);
}

/** Come `useFeature`, ma per interrogare più funzioni insieme (es. per filtrare un elenco di voci). */
export function useFeatures(): (feature: SpaceFeature) => boolean {
  const { spaces, selected, myRole } = useSpace();
  const scoped = spaces.filter((s) => selected === 'all' || s.id === selected);
  return (feature) => featureOnForRoles(scoped, feature, myRole);
}
