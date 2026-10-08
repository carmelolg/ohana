import { describe, expect, it } from 'vitest';
import { buildModel, chooseCategory, parseQuick, romeToDate, type Feedback } from '../src';
import { ALLOWED, DATASET, type Label } from './category-dataset';

// Valutazione: quanto migliora la categoria quando l'app impara dalle correzioni dell'utente?
// Protocollo: stesso test set fisso (30% del dataset); si addestra su k esempi (dalla parte restante) simulando il comportamento
// dell'app (si registra una correzione se la scelta era sbagliata, una conferma se era riconosciuta ed era giusta; «altro» di default non si registra).
// Si ripete su molte suddivisioni casuali (generatore con seme fisso: risultato riproducibile).

const NOW = romeToDate(2026, 10, 8, 10, 0);
function rng(seed: number) {
  let s = seed >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}
function shuffle<T>(a: T[], r: () => number): T[] {
  const x = [...a];
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
}

const ruleLabel = (text: string): string | null => {
  const p = parseQuick(text, NOW); // senza parole chiave personalizzate: l'utente non le ha configurate
  return p.categoryRecognized ? p.category : null;
};
const cleanText = (text: string) => parseQuick(text, NOW).title || text;

function accuracy(test: [string, Label][], model: ReturnType<typeof buildModel> | null): number {
  let ok = 0;
  for (const [t, truth] of test) {
    const rl = ruleLabel(t);
    const pred = model
      ? chooseCategory({ text: cleanText(t), ruleLabel: rl, model, allowed: ALLOWED }).label
      : rl;
    if ((pred ?? 'altro') === truth) {
      ok++;
    }
  }
  return ok / test.length;
}

function simulate(train: [string, Label][]): Feedback[] {
  const fb: Feedback[] = [];
  for (const [t, truth] of train) {
    const rl = ruleLabel(t);
    const shown = rl ?? 'altro'; // quello che l'editor avrebbe proposto
    if (shown !== truth) {
      fb.push({ text: cleanText(t), label: truth, corrected: true });
    } else if (rl && rl !== 'altro') {
      fb.push({ text: cleanText(t), label: truth, corrected: false });
    }
  }
  return fb;
}

describe('apprendimento delle categorie: regole da sole vs regole + Naive Bayes', () => {
  const SIZES = [0, 5, 10, 20, 40, 80];
  const RUNS = 40;
  const results: Record<number, { rules: number[]; model: number[] }> = Object.fromEntries(
    SIZES.map((k) => [k, { rules: [], model: [] }]),
  );

  for (let run = 0; run < RUNS; run++) {
    const r = rng(1000 + run);
    const all = shuffle(DATASET, r);
    const cut = Math.round(all.length * 0.3);
    const test = all.slice(0, cut);
    const pool = all.slice(cut);
    for (const k of SIZES) {
      const train = pool.slice(0, k);
      results[k].rules.push(accuracy(test, null));
      results[k].model.push(accuracy(test, buildModel(simulate(train))));
    }
  }
  const mean = (a: number[]) => a.reduce((t, x) => t + x, 0) / a.length;
  const sd = (a: number[]) => Math.sqrt(mean(a.map((x) => (x - mean(a)) ** 2)));

  it('stampa la curva di apprendimento', () => {
    const rows = SIZES.map(
      (k) =>
        `${String(k).padStart(3)} correzioni/conferme │ solo regole ${(mean(results[k].rules) * 100).toFixed(1)}% │ regole + NB ${(mean(results[k].model) * 100).toFixed(1)}% ± ${(sd(results[k].model) * 100).toFixed(1)}`,
    );
    console.log(
      `\nCategoria corretta su ${Math.round(DATASET.length * 0.3)} esempi mai visti, media di ${RUNS} suddivisioni (dataset sintetico di ${DATASET.length} esempi)\n${rows.join('\n')}\n`,
    );
    expect(rows).toHaveLength(SIZES.length);
  });

  it('senza correzioni non peggiora le regole (nessuna regressione)', () => {
    expect(mean(results[0].model)).toBeGreaterThanOrEqual(mean(results[0].rules) - 0.02);
  });

  it("con l'uso migliora nettamente e in modo crescente", () => {
    const base = mean(results[0].rules);
    expect(mean(results[20].model)).toBeGreaterThan(base + 0.12);
    expect(mean(results[80].model)).toBeGreaterThan(base + 0.2);
    expect(mean(results[80].model)).toBeGreaterThan(mean(results[10].model));
  });

  it('non peggiora mai le regole in modo apprezzabile, a nessuna dimensione', () => {
    for (const k of SIZES) {
      expect(mean(results[k].model)).toBeGreaterThanOrEqual(mean(results[k].rules) - 0.02);
    }
  });
});
