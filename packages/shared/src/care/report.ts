import { normalizeText } from '../text';

/** Valori di esame che l'app sa mostrare con etichetta e unità (oltre ai parametri monitorabili). */
export const EXAM_READING_KEYS = ['calprotectin_ugg', 'crp_mgdl'] as const;

const NUMBER = '(\\d+(?:[.,]\\d+)?)';

interface Rule {
  key: string;
  pattern: RegExp;
  /** Costruisce il testo del valore dai gruppi trovati. */
  format: (m: RegExpExecArray) => string;
}

const RULES: Rule[] = [
  {
    key: 'calprotectin_ugg',
    pattern: new RegExp(`calprotectin\\w*[^\\d\\n]{0,40}${NUMBER}`),
    format: (m) => m[1],
  },
  {
    key: 'crp_mgdl',
    pattern: new RegExp(`\\b(?:pcr|proteina c reattiva)[^\\d\\n]{0,30}${NUMBER}`),
    format: (m) => m[1],
  },
  {
    key: 'blood_pressure',
    pattern: /\b(?:pressione|p\.a\.|pa)\b[^\d\n]{0,25}(\d{2,3})\s*\/\s*(\d{2,3})/,
    format: (m) => `${m[1]}/${m[2]}`,
  },
  {
    key: 'heart_rate',
    pattern: /\b(?:frequenza cardiaca|fc|battiti)\b[^\d\n]{0,20}(\d{2,3})\b/,
    format: (m) => m[1],
  },
  { key: 'weight', pattern: new RegExp(`\\bpeso\\b[^\\d\\n]{0,20}${NUMBER}\\s*kg`), format: (m) => m[1] },
];

/**
 * Cerca nel testo letto da un referto (OCR) i valori che l'app conosce: calprotectina, PCR, pressione, frequenza cardiaca,
 * peso. Restituisce testo per campo del modulo; l'utente conferma sempre prima di salvare.
 */
export function extractReadings(text: string): Record<string, string> {
  const flat = normalizeText(text);
  const out: Record<string, string> = {};
  for (const rule of RULES) {
    const match = rule.pattern.exec(flat);
    if (match) {
      out[rule.key] = rule.format(match).replace('.', ',');
    }
  }
  return out;
}
