import { fullName, shortName } from '@ohana/shared';

export { fullName, shortName };

/** Colore di un filone di cura (stesso tono a ogni luminosità del design). */
export const careColor = (hue: number | undefined | null) => `oklch(0.58 0.12 ${hue ?? 20})`;

export const spaceColor = (hue: number | undefined | null) => `oklch(0.6 0.1 ${hue ?? 42})`;

export const initials = (first?: string, last?: string, nickname?: string | null, fallback = '?') =>
  (nickname?.trim() ? nickname.trim().slice(0, 2) : (first?.[0] ?? '') + (last?.[0] ?? '')).toUpperCase() ||
  fallback.slice(0, 2).toUpperCase();
