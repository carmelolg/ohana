// Naive Bayes multinomiale «leggero» per classificare un testo breve (es. il titolo di un impegno) in una categoria.
// Pensato per girare nel browser: pochi KB di pesi, nessuna libreria, addestramento incrementale.
//
// Caratteristiche:
//  - feature = parole + n-grammi di caratteri (3–5): reggono refusi e forme diverse («caldaia», «caldaietta», «caldaja»);
//  - addestramento incrementale: aggiungere un esempio aggiorna i conteggi, quindi imparare da una correzione costa O(feature);
//  - esempi pesati (una correzione dell'utente vale più di un esempio di partenza);
//  - probabilità calibrabili con una «temperatura», e restrizione ai soli label ammessi (le categorie di quello spazio).

import { normalizeText } from './text';

export interface NbClass {
  /** massa degli esempi (somma dei pesi) */
  n: number;
  /** massa totale delle feature osservate */
  total: number;
  /** conteggio (pesato) di ogni feature */
  f: Record<string, number>;
}

export interface NbModel {
  v: 1;
  classes: Record<string, NbClass>;
  /** feature viste almeno una volta in qualunque classe */
  vocab: Record<string, 1>;
  /** quanti esempi dell'utente (non di partenza) hanno contribuito */
  userExamples: number;
}

export interface NbPrediction {
  label: string | null;
  prob: number;
  ranking: { label: string; prob: number }[];
}

const STOP = new Set([
  'il',
  'lo',
  'la',
  'le',
  'i',
  'gli',
  'un',
  'una',
  'uno',
  'di',
  'del',
  'della',
  'dei',
  'delle',
  'dello',
  'a',
  'al',
  'alla',
  'alle',
  'ai',
  'da',
  'dal',
  'dalla',
  'in',
  'nel',
  'nella',
  'con',
  'per',
  'su',
  'tra',
  'fra',
  'e',
  'ed',
  'o',
  'che',
  'mi',
  'ti',
  'si',
  'ci',
  'oggi',
  'domani',
  'dopodomani',
  'ore',
  'ora',
]);
const CHAR_WEIGHT = 0.35;

/** Parole e n-grammi di caratteri con il loro peso (le parole contano di più dei frammenti). */
export function features(text: string): Map<string, number> {
  const out = new Map<string, number>();
  const add = (k: string, w: number) => out.set(k, (out.get(k) ?? 0) + w);
  const words = normalizeText(text)
    .replace(/[^a-z0-9' ]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !/^\d+$/.test(w) && !STOP.has(w));
  for (const w of words) {
    add('w:' + w, 1);
    if (w.length >= 4) {
      const p = `^${w}$`;
      for (const n of [3, 4, 5]) {
        for (let i = 0; i + n <= p.length; i++) {
          add('c:' + p.slice(i, i + n), CHAR_WEIGHT);
        }
      }
    }
  }
  return out;
}

export const createModel = (): NbModel => ({ v: 1, classes: {}, vocab: {}, userExamples: 0 });

/** Aggiunge un esempio. `user` = true se viene da una scelta/correzione reale dell'utente. */
export function train(model: NbModel, text: string, label: string, weight = 1, user = false): NbModel {
  const feats = features(text);
  if (feats.size === 0) {
    return model;
  }
  const c = (model.classes[label] ??= { n: 0, total: 0, f: {} });
  c.n += weight;
  for (const [k, w] of feats) {
    c.f[k] = (c.f[k] ?? 0) + w * weight;
    c.total += w * weight;
    model.vocab[k] = 1;
  }
  if (user) {
    model.userExamples++;
  }
  return model;
}

export interface PredictOptions {
  /** limita il risultato a questi label (le categorie dello spazio) */
  labels?: string[];
  /** > 1 ammorbidisce le probabilità (il Naive Bayes è naturalmente troppo sicuro di sé) */
  temperature?: number;
  /** moltiplica la temperatura automatica (< 1 = probabilità più nette) */
  tempScale?: number;
  alpha?: number;
}

export function predict(model: NbModel, text: string, opts: PredictOptions = {}): NbPrediction {
  const alpha = opts.alpha ?? 0.5;
  const labels = (opts.labels ?? Object.keys(model.classes)).filter((l) => model.classes[l]);
  const feats = [...features(text)].filter(([k]) => model.vocab[k]); // le feature mai viste non portano informazione
  if (labels.length === 0 || feats.length === 0) {
    return { label: null, prob: 0, ranking: [] };
  }
  const V = Object.keys(model.vocab).length;
  const totalN = labels.reduce((t, l) => t + model.classes[l].n, 0);
  const mass = feats.reduce((t, [, w]) => t + w, 0);
  // temperatura che cresce con la quantità di prove nel testo: testi lunghi → log-verosimiglianze enormi
  const T = opts.temperature ?? Math.max(1, Math.sqrt(mass) * (opts.tempScale ?? 1));
  const logp = labels.map((l) => {
    const c = model.classes[l];
    let s = Math.log((c.n + 1) / (totalN + labels.length)); // prior (con smoothing)
    const denom = c.total + alpha * V;
    for (const [k, w] of feats) {
      s += w * Math.log(((c.f[k] ?? 0) + alpha) / denom);
    }
    return s / T;
  });
  const max = Math.max(...logp);
  const exps = logp.map((x) => Math.exp(x - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  const ranking = labels.map((label, i) => ({ label, prob: exps[i] / sum })).sort((a, b) => b.prob - a.prob);
  return { label: ranking[0].label, prob: ranking[0].prob, ranking };
}

export const serializeModel = (m: NbModel) => JSON.stringify(m);
export function deserializeModel(json: string): NbModel {
  const m = JSON.parse(json) as NbModel;
  if (m.v !== 1 || typeof m.classes !== 'object') {
    throw new Error('Modello non valido');
  }
  return m;
}
