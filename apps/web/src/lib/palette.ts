import { PALETTE_COLORS, toPalette, type Palette, type PaletteTokens } from '@ohana/shared';

/** Variabili CSS che una palette sovrascrive, con il nome del token in `shared`. */
const PALETTE_VARS: [keyof PaletteTokens, string][] = [
  ['bg', '--bg'],
  ['surface', '--surface'],
  ['surface2', '--surface-2'],
  ['side', '--side'],
  ['text', '--text'],
  ['text2', '--text-2'],
  ['text3', '--text-3'],
  ['lineStrong', '--line-strong'],
];

/**
 * Scrive i colori della palette come proprietà inline su `<html>`: l'inline vince sulle regole del foglio,
 * quindi la palette sostituisce i fallback di `styles.css` senza duplicare regole per ogni combinazione.
 * Restituisce i colori applicati (serve anche al `theme-color` del browser). Un valore sconosciuto ricade sul predefinito.
 */
export function applyPaletteVars(palette: Palette, dark: boolean): PaletteTokens {
  const tokens = PALETTE_COLORS[toPalette(palette)][dark ? 'dark' : 'light'];
  const style = document.documentElement.style;
  for (const [token, cssVar] of PALETTE_VARS) {
    style.setProperty(cssVar, tokens[token]);
  }
  return tokens;
}
