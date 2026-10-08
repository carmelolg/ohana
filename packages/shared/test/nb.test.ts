import { describe, expect, it } from 'vitest';
import {
  buildModel,
  chooseCategory,
  createModel,
  deserializeModel,
  features,
  predict,
  seedModel,
  serializeModel,
  train,
} from '../src';

describe('Naive Bayes leggero', () => {
  const small = () => {
    const m = createModel();
    for (const t of ['visita cardiologica', 'prelievo sangue', 'ecografia addome']) {
      train(m, t, 'visita');
    }
    for (const t of ['idraulico bagno', 'elettricista casa', 'commercialista dichiarazione']) {
      train(m, t, 'professionista');
    }
    return m;
  };

  it('feature: parole e frammenti, senza stopword né numeri', () => {
    const f = features('Visita dal dentista alle 15');
    expect([...f.keys()]).toEqual(expect.arrayContaining(['w:visita', 'w:dentista', 'c:^den', 'c:ista$']));
    expect(f.has('w:dal')).toBe(false);
    expect(f.has('w:15')).toBe(false);
    expect(f.get('w:visita')).toBeGreaterThan(f.get('c:^vis')!);
  });

  it('impara e classifica', () => {
    const m = small();
    expect(predict(m, 'ecografia tiroide').label).toBe('visita');
    expect(predict(m, 'idraulico cucina').label).toBe('professionista');
  });

  it('regge refusi e forme diverse grazie ai frammenti di caratteri', () => {
    const m = small();
    expect(predict(m, 'idrualico bagno').label).toBe('professionista');
    expect(predict(m, 'cardiologico controllo').label).toBe('visita');
  });

  it('testo senza feature note → nessuna previsione (non inventa)', () => {
    expect(predict(small(), 'xqzv').label).toBeNull();
    expect(predict(createModel(), 'qualcosa').label).toBeNull();
  });

  it('restringe ai label ammessi', () => {
    const m = small();
    expect(predict(m, 'idraulico bagno', { labels: ['visita'] }).label).toBe('visita');
    expect(predict(m, 'idraulico bagno', { labels: ['inesistente'] }).label).toBeNull();
  });

  it('le probabilità sommano a 1 e sono ordinate', () => {
    const r = predict(small(), 'prelievo sangue');
    expect(r.ranking.reduce((t, x) => t + x.prob, 0)).toBeCloseTo(1, 6);
    expect(r.ranking[0].prob).toBeGreaterThanOrEqual(r.ranking[1].prob);
  });

  it("l'addestramento è incrementale: esempio dopo esempio = tutto insieme; il peso conta", () => {
    const a = createModel();
    const b = createModel();
    for (const [t, l] of [
      ['visita cardiologica', 'visita'],
      ['idraulico bagno', 'professionista'],
    ] as const) {
      train(a, t, l);
    }
    train(b, 'visita cardiologica', 'visita');
    train(b, 'idraulico bagno', 'professionista');
    expect(serializeModel(a)).toBe(serializeModel(b));
    const heavy = createModel();
    train(heavy, 'giorgio caldaia', 'professionista', 1);
    train(heavy, 'giorgio caldaia', 'visita', 5);
    expect(predict(heavy, 'giorgio').label).toBe('visita');
  });

  it('serializzazione round-trip identica e compatta', () => {
    const m = buildModel([{ text: 'allenamento Sofia', label: 'id:sport', corrected: true }]);
    const back = deserializeModel(serializeModel(m));
    expect(predict(back, 'allenamento Sofia').label).toBe(predict(m, 'allenamento Sofia').label);
    expect(serializeModel(m).length).toBeLessThan(250_000);
    expect(() => deserializeModel('{"v":2}')).toThrow();
  });
});

describe('modello di partenza + correzioni', () => {
  it("il seed conosce le categorie classiche senza dati dell'utente", () => {
    const m = seedModel();
    expect(m.userExamples).toBe(0);
    expect(predict(m, 'dentista').label).toBe('visita');
    expect(predict(m, 'bollo auto').label).toBe('scadenza');
  });

  it("una correzione ripetuta insegna un'etichetta nuova (categoria personalizzata)", () => {
    const fb = [
      { text: 'allenamento Sofia', label: 'id:sport', corrected: true },
      { text: 'partita Luca', label: 'id:sport', corrected: true },
      { text: 'nuoto Sofia', label: 'id:sport', corrected: true },
    ];
    const m = buildModel(fb);
    expect(m.userExamples).toBe(3);
    const r = predict(m, 'allenamento Luca', { labels: ['visita', 'altro', 'id:sport'] });
    expect(r.label).toBe('id:sport');
  });
});

describe('scelta tra regole e modello', () => {
  const allowed = ['visita', 'professionista', 'altro', 'id:sport'];
  const fb = (n: number) =>
    buildModel(
      Array.from({ length: n }, (_, i) => ({
        text: i % 2 ? 'allenamento Sofia' : 'allenamento Luca',
        label: 'id:sport',
        corrected: true,
      })),
    );

  it('categoria personalizzata riconosciuta dalle regole: non si tocca', () => {
    const c = chooseCategory({
      text: 'veterinario cane',
      ruleLabel: 'id:animali',
      ruleIsCustom: true,
      model: fb(10),
      allowed: [...allowed, 'id:animali'],
    });
    expect(c).toMatchObject({ label: 'id:animali', source: 'rules' });
  });
  it('regole mute + modello che ha imparato → il modello riempie', () => {
    const c = chooseCategory({ text: 'allenamento Sofia', ruleLabel: 'altro', model: fb(6), allowed });
    expect(c).toMatchObject({ label: 'id:sport', source: 'model' });
    expect(c.prob).toBeGreaterThan(0.6);
  });
  it('poche correzioni: su un testo solo simile non ci si fida ancora (soglia alta)', () => {
    const c = chooseCategory({ text: 'tennis mamma', ruleLabel: 'altro', model: fb(1), allowed });
    expect(c.source).not.toBe('model');
  });
  it('regole sicure e nessun motivo per cambiare → regole', () => {
    const c = chooseCategory({ text: 'visita cardiologica', ruleLabel: 'visita', model: fb(6), allowed });
    expect(c).toMatchObject({ label: 'visita', source: 'rules' });
  });
  it("l'uso può scavalcare una regola quando è molto sicuro", () => {
    const m = buildModel(
      Array.from({ length: 8 }, () => ({ text: 'ginnastica nonna', label: 'visita', corrected: true })),
    );
    const c = chooseCategory({ text: 'ginnastica nonna', ruleLabel: 'altro', model: m, allowed });
    expect(c).toMatchObject({ label: 'visita', source: 'model' });
  });
  it('senza regole e senza modello utile → nessuna scelta inventata', () => {
    expect(chooseCategory({ text: 'xqzv', ruleLabel: null, model: seedModel(), allowed })).toMatchObject({
      label: null,
      source: 'none',
    });
  });
});
