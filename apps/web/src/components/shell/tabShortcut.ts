import { ShoppingBasket, Users, Wallet, type LucideIcon } from 'lucide-react';
import type { SpaceFeature } from '@ohana/shared';

interface TabShortcut {
  to: string;
  label: string;
  Icon: LucideIcon;
  /** Senza `feature` la scorciatoia c'è sempre. */
  feature?: SpaceFeature;
}

/** In ordine di preferenza: la prima accesa occupa il posto a destra del «+». L'ultima non si spegne, quindi il posto non resta mai vuoto. */
const SHORTCUTS: TabShortcut[] = [
  { to: '/spesa', label: 'Spesa', Icon: ShoppingBasket, feature: 'spesa' },
  { to: '/spese', label: 'Spese', Icon: Wallet, feature: 'spese' },
  { to: '/rubrica', label: 'Rubrica', Icon: Users },
];

/**
 * La barra mobile ha due voci a sinistra del «+» e due a destra: se la Spesa è spenta il posto passa alla prima
 * funzione accesa tra quelle sopra, così il «+» resta al centro.
 */
export function pickTabShortcut(isOn: (feature: SpaceFeature) => boolean): TabShortcut {
  return SHORTCUTS.find((s) => !s.feature || isOn(s.feature)) ?? SHORTCUTS[SHORTCUTS.length - 1];
}
