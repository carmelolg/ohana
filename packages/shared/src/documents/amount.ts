import type { DocType, Hit } from './types';

/** «1.234,56» · «84,20» · «84.20» → numero */
export function parseAmount(raw: string): number | null {
  let s = raw.replace(/\s/g, '');
  if (/^\d{1,3}(\.\d{3})+,\d{1,2}$/.test(s)) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (/^\d+,\d{1,2}$/.test(s)) {
    s = s.replace(',', '.');
  } else if (!/^\d+(\.\d{1,2})?$/.test(s)) {
    return null;
  }
  const n = Number(s);
  return Number.isFinite(n) && n > 0 && n < 1_000_000 ? Math.round(n * 100) / 100 : null;
}

// Cifra in euro: «84,20», «1.234,56», «84.20». Non deve far parte di un numero più lungo (0,1234 €/kWh) né essere un prezzo unitario.
const NUM = String.raw`\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2}|\d+\.\d{2}`;
function amounts(text: string): Hit<number>[] {
  const out: Hit<number>[] = [];
  const re1 = new RegExp(String.raw`(?:€|eur(?:o)?\.?)\s*(${NUM})(?![\d,]|\.\d)(?!\s*/)`, 'gi');
  const re2 = new RegExp(String.raw`(?<![\d,.])(${NUM})(?![\d,])\s*(?:€|eur(?:o)?\b)(?!\s*/)`, 'gi');
  for (const re of [re1, re2]) {
    for (const m of text.matchAll(re)) {
      const v = parseAmount(m[1]);
      if (v != null && !out.some((o) => Math.abs(o.index - (m.index ?? 0)) < 3)) {
        out.push({ value: v, index: m.index ?? 0 });
      }
    }
  }
  return out.sort((a, b) => a.index - b.index);
}

// Etichette che precedono l'importo e quanto valgono. Più è specifica la dicitura, più peso ha.
const AMOUNT_RULES: [RegExp, number][] = [
  [/totale\s+da\s+pagare/g, 100],
  [/importo\s+da\s+pagare/g, 95],
  [/totale\s+(?:bolletta|fattura|documento|dovuto)/g, 88],
  [/da\s+pagare/g, 85],
  [/importo\s+(?:dovuto|complessivo|totale)/g, 80],
  [/ticket|compartecipazione/g, 70],
  [/importo\s+ridotto/g, 60],
  [/rata\s+(?:da\s+versare|di)/g, 50],
  [/\btotale\b/g, 40],
  [/\bimporto\b/g, 30],
];
// Voci intermedie di una bolletta: non sono il totale da pagare.
const SUBTOTAL =
  /(?:totale|importo|spesa|quota|costo|subtotale)\s+(?:per\s+(?:il|la|lo|l'|i|le)?\s*)?(?:imposte|iva|accise|servizi|trasporto|energia|gas|consum\w*|oneri|imponibile|parzial\w*|materia|canone|rai|bollo|acconto|conguagl\w*|vendita|rete|gestione)|\bsubtotale\b|\bdi\s+cui\b|canone\s+rai|\bimposte?\b|\baccise\b/;

export interface AmountResult {
  best: number | null;
  sure: boolean;
  candidates: number[];
}

/**
 * Sceglie l'importo da pagare. Ogni cifra riceve un punteggio dall'etichetta che la precede (stessa riga o riga sopra),
 * penalizzata se è una voce intermedia («totale imposte», «spesa per il trasporto»…); a parità vince la cifra più alta.
 * `low` è il testo già normalizzato: gli indici di cifre ed etichette devono riferirsi alla STESSA stringa.
 */
export function pickAmount(low: string, docType: DocType): AmountResult {
  const all = amounts(low);
  if (all.length === 0) {
    return { best: null, sure: false, candidates: [] };
  }
  const scored = all.map((a) => {
    const ctx = low.slice(Math.max(0, a.index - 80), a.index);
    let score = 0;
    for (const [re, w] of AMOUNT_RULES) {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      let lastEnd = -1;
      while ((m = re.exec(ctx))) {
        lastEnd = m.index + m[0].length;
      }
      if (lastEnd >= 0) {
        score = Math.max(score, w - (ctx.length - lastEnd) / 8);
      }
    }
    // l'etichetta più vicina all'importo decide se è una voce intermedia
    const tail = ctx.slice(-48);
    if (SUBTOTAL.test(tail) && score < 85) {
      score -= 60;
    }
    return { value: a.value, score };
  });
  const ranked = [...scored].sort((x, y) => y.score - x.score || y.value - x.value);
  const candidates = [...new Set(ranked.map((r) => r.value))].slice(0, 6);
  const top = ranked[0];
  if (top.score >= 30) {
    return { best: top.value, sure: top.score >= 60, candidates };
  }
  if (docType === 'referto' || docType === 'ricetta') {
    return { best: null, sure: false, candidates };
  }
  return { best: Math.max(...all.map((a) => a.value)), sure: false, candidates };
}
