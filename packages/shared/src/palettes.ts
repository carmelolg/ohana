/**
 * Palette: l'insieme di colori di superficie e testo scelto da ogni utente per il proprio profilo.
 * È ortogonale a chiaro/scuro (ogni palette ha una variante per modo) e all'accento.
 */
export const PALETTES = ['ohana', 'lavanda', 'notte', 'carta', 'contrasto'] as const;
export type Palette = (typeof PALETTES)[number];
export const DEFAULT_PALETTE: Palette = 'ohana';

export const PALETTE_LABEL: Record<Palette, string> = {
  ohana: 'Ohana',
  lavanda: 'Lavanda',
  notte: 'Notte',
  carta: 'Carta',
  contrasto: 'Contrasto',
};

/** Token di colore che una palette definisce; i nomi ricalcano le variabili CSS di `styles.css`. */
export interface PaletteTokens {
  bg: string;
  surface: string;
  surface2: string;
  side: string;
  text: string;
  text2: string;
  text3: string;
  lineStrong: string;
}

export interface PaletteColors {
  light: PaletteTokens;
  dark: PaletteTokens;
}

export const PALETTE_COLORS: Record<Palette, PaletteColors> = {
  ohana: {
    light: {
      bg: '#fbf9f6',
      surface: '#ffffff',
      surface2: '#f3efe9',
      side: '#f6f3ee',
      text: '#1e1b17',
      text2: '#4a443d',
      text3: '#6b645b',
      lineStrong: '#c8c0b4',
    },
    dark: {
      bg: '#1d1a17',
      surface: '#2b2621',
      surface2: '#38322b',
      side: '#24201c',
      text: '#f1ebe2',
      text2: '#a89e92',
      text3: '#a89e92',
      lineStrong: '#5a5148',
    },
  },
  lavanda: {
    light: {
      bg: '#f6f3fa',
      surface: '#ffffff',
      surface2: '#ece7f4',
      side: '#efeaf6',
      text: '#211b2e',
      text2: '#473f5a',
      text3: '#5f5673',
      lineStrong: '#c4bcd6',
    },
    dark: {
      bg: '#1a1622',
      surface: '#26202f',
      surface2: '#322a3e',
      side: '#1f1a28',
      text: '#ece6f5',
      text2: '#aca2c0',
      text3: '#aca2c0',
      lineStrong: '#52476a',
    },
  },
  notte: {
    light: {
      bg: '#eef2f8',
      surface: '#ffffff',
      surface2: '#e2e8f2',
      side: '#e8edf5',
      text: '#17202e',
      text2: '#3b4659',
      text3: '#4f5b6d',
      lineStrong: '#b7c1d1',
    },
    dark: {
      bg: '#141a24',
      surface: '#1d2532',
      surface2: '#263041',
      side: '#19202c',
      text: '#e6ebf3',
      text2: '#9fabbd',
      text3: '#9fabbd',
      lineStrong: '#444f62',
    },
  },
  carta: {
    light: {
      bg: '#ffffff',
      surface: '#fbfbfa',
      surface2: '#f2f2f0',
      side: '#f5f5f3',
      text: '#161616',
      text2: '#444444',
      text3: '#5a5a5a',
      lineStrong: '#bdbdbb',
    },
    dark: {
      bg: '#121212',
      surface: '#1c1c1c',
      surface2: '#262626',
      side: '#181818',
      text: '#ececec',
      text2: '#aaaaaa',
      text3: '#aaaaaa',
      lineStrong: '#4a4a4a',
    },
  },
  contrasto: {
    light: {
      bg: '#ffffff',
      surface: '#ffffff',
      surface2: '#f0f0f0',
      side: '#ffffff',
      text: '#000000',
      text2: '#1a1a1a',
      text3: '#333333',
      lineStrong: '#000000',
    },
    dark: {
      bg: '#000000',
      surface: '#000000',
      surface2: '#1a1a1a',
      side: '#000000',
      text: '#ffffff',
      text2: '#e6e6e6',
      text3: '#d0d0d0',
      lineStrong: '#ffffff',
    },
  },
};

export function isPalette(value: unknown): value is Palette {
  return typeof value === 'string' && (PALETTES as readonly string[]).includes(value);
}

/** Valore salvato o letto da una cache: se sconosciuto o assente, torna la palette predefinita. */
export function toPalette(value: unknown): Palette {
  return isPalette(value) ? value : DEFAULT_PALETTE;
}
