import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PALETTE,
  PALETTES,
  PALETTE_COLORS,
  isPalette,
  toPalette,
  type Palette,
  type PaletteTokens,
} from '../src';

/** Luminanza relativa WCAG di un colore esadecimale #rrggbb. */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Rapporto di contrasto WCAG fra due colori esadecimali. */
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Coppie di testo che devono restare leggibili sulla superficie su cui compaiono. */
const TEXT_ON_SURFACE: [keyof PaletteTokens, keyof PaletteTokens][] = [
  ['text', 'bg'],
  ['text', 'surface'],
  ['text', 'surface2'],
  ['text2', 'surface'],
  ['text2', 'surface2'],
  ['text3', 'surface'],
  ['text3', 'surface2'],
];

describe('palette', () => {
  it('ogni palette ha entrambe le varianti con tutti i token', () => {
    for (const palette of PALETTES) {
      for (const mode of ['light', 'dark'] as const) {
        const tokens = PALETTE_COLORS[palette][mode];
        for (const value of Object.values(tokens)) {
          expect(value).toMatch(/^#[0-9a-f]{6}$/);
        }
      }
    }
  });

  it.each(PALETTES.map((p) => [p]))('%s rispetta il contrasto WCAG AA per il testo (4.5:1)', (palette) => {
    checkContrast(palette as Palette, 4.5);
  });

  it('la palette contrasto arriva almeno a 7:1 (AAA)', () => {
    checkContrast('contrasto', 7);
  });

  it('il default è ohana e i valori sconosciuti ricadono su di lui', () => {
    expect(DEFAULT_PALETTE).toBe('ohana');
    expect(toPalette('lavanda')).toBe('lavanda');
    expect(toPalette('inventata')).toBe('ohana');
    expect(toPalette(undefined)).toBe('ohana');
    expect(toPalette(null)).toBe('ohana');
  });

  it('isPalette riconosce solo gli identificativi noti', () => {
    expect(isPalette('notte')).toBe(true);
    expect(isPalette('Notte')).toBe(false);
    expect(isPalette(3)).toBe(false);
  });
});

function checkContrast(palette: Palette, minimum: number) {
  for (const mode of ['light', 'dark'] as const) {
    const tokens = PALETTE_COLORS[palette][mode];
    for (const [text, surface] of TEXT_ON_SURFACE) {
      const ratio = contrast(tokens[text], tokens[surface]);
      expect(ratio, `${palette}/${mode}: ${text} su ${surface}`).toBeGreaterThanOrEqual(minimum);
    }
  }
}
