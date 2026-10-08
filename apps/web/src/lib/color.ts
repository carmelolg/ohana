import { fullName, shortName } from '@ohana/shared';

export { fullName, shortName };

export const spaceColor = (hue: number | undefined | null) => `oklch(0.6 0.1 ${hue ?? 42})`;

export const initials = (first?: string, last?: string, nickname?: string | null, fallback = '?') =>
  (nickname?.trim() ? nickname.trim().slice(0, 2) : (first?.[0] ?? '') + (last?.[0] ?? '')).toUpperCase() ||
  fallback.slice(0, 2).toUpperCase();
