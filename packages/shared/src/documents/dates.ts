import { MONTHS_IT as MONTHS, romeToDate } from '../dates';
import type { Hit } from './types';

export function findDates(text: string): Hit<Date>[] {
  const out: Hit<Date>[] = [];
  const mk = (d: number, m: number, y: number, index: number) => {
    if (y < 100) {
      y += 2000;
    }
    if (d < 1 || d > 31 || m < 1 || m > 12 || y < 2000 || y > 2100) {
      return;
    }
    out.push({ value: romeToDate(y, m, d, 9, 0), index });
  };
  for (const m of text.matchAll(/\b(\d{1,2})\s*[/.-]\s*(\d{1,2})\s*[/.-]\s*(\d{4}|\d{2})\b/g)) {
    mk(+m[1], +m[2], +m[3], m.index ?? 0);
  }
  const names = MONTHS.join('|');
  for (const m of text.matchAll(new RegExp(String.raw`\b(\d{1,2})\s+(${names})\s+(\d{4})\b`, 'gi'))) {
    mk(+m[1], (MONTHS as readonly string[]).indexOf(m[2].toLowerCase()) + 1, +m[3], m.index ?? 0);
  }
  return out.sort((a, b) => a.index - b.index);
}

export const DUE_KEYS = [
  /data\s+(?:di\s+)?scadenza/,
  /scadenza/,
  /scade\s+il/,
  /da\s+pagare\s+entro/,
  /pagabile\s+entro/,
  /pagamento\s+entro/,
  /entro\s+il/,
  /entro\s+(?=\d)/,
  /pagare\s+entro/,
  /versare\s+entro/,
];
export const ISSUE_KEYS = [
  /data\s+(?:di\s+)?emissione/,
  /emess[ao]\s+il/,
  /data\s+fattura/,
  /data\s+documento/,
  /fattura\s+del/,
  /bolletta\s+del/,
  /data\s+verbale/,
  /data\s+del\s+verbale/,
  /\bdel\b/,
];

export function pickDate(low: string, ds: Hit<Date>[], keys: RegExp[]): Date | null {
  for (const key of keys) {
    for (const m of low.matchAll(new RegExp(key, 'g'))) {
      const at = m.index ?? 0;
      const near = ds.find((d) => d.index >= at && d.index - at < 70);
      if (near) {
        return near.value;
      }
    }
  }
  return null;
}
