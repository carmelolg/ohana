import { createModel, predict, train, type NbModel, type NbPrediction } from './nb';

// ------------------------------------------------------------------ esempi di partenza
// Un po' di buon senso per le sei categorie predefinite, così il modello non parte da zero.
// Sono frasi brevi come quelle che si scrivono davvero; le regole del parser restano comunque la prima linea.
export const SEED_EXAMPLES: [string, string][] = [
  // visita
  ['visita cardiologica', 'visita'],
  ['prelievo del sangue', 'visita'],
  ['dentista', 'visita'],
  ['oculista controllo vista', 'visita'],
  ['ecografia addome', 'visita'],
  ['analisi del sangue', 'visita'],
  ['risonanza magnetica', 'visita'],
  ['vaccino antinfluenzale', 'visita'],
  ['fisioterapia', 'visita'],
  ['dermatologo', 'visita'],
  ['pediatra controllo', 'visita'],
  ['ortopedico visita ginocchio', 'visita'],
  ['dottore medico di base', 'visita'],
  ['ecocardiogramma', 'visita'],
  ['otorino', 'visita'],
  // professionista
  ['idraulico perdita lavandino', 'professionista'],
  ['elettricista', 'professionista'],
  ['commercialista dichiarazione', 'professionista'],
  ['avvocato consulenza', 'professionista'],
  ['notaio rogito', 'professionista'],
  ['geometra sopralluogo', 'professionista'],
  ['imbianchino preventivo', 'professionista'],
  ['fabbro serratura', 'professionista'],
  ['tecnico caldaia', 'professionista'],
  ['meccanico tagliando', 'professionista'],
  ['architetto progetto', 'professionista'],
  ['falegname', 'professionista'],
  // burocrazia
  ['anagrafe carta identità', 'burocrazia'],
  ['comune certificato', 'burocrazia'],
  ['inps pratica', 'burocrazia'],
  ['agenzia delle entrate', 'burocrazia'],
  ['rinnovo patente', 'burocrazia'],
  ['passaporto questura', 'burocrazia'],
  ['catasto visura', 'burocrazia'],
  ['tessera sanitaria asl', 'burocrazia'],
  ['spid documento', 'burocrazia'],
  ['motorizzazione pratica auto', 'burocrazia'],
  // commissione
  ['ritirare il pacco', 'commissione'],
  ['farmacia ritiro medicine', 'commissione'],
  ['posta raccomandata', 'commissione'],
  ['banca bonifico', 'commissione'],
  ['comprare regalo', 'commissione'],
  ['ferramenta viti', 'commissione'],
  ['portare giacca in lavanderia', 'commissione'],
  ['consegna pacco corriere', 'commissione'],
  ['prendere i bambini', 'commissione'],
  ['spesa al mercato', 'commissione'],
  // scadenza
  ['bollo auto', 'scadenza'],
  ['assicurazione auto', 'scadenza'],
  ['imu seconda rata', 'scadenza'],
  ['tari rifiuti', 'scadenza'],
  ['rata mutuo', 'scadenza'],
  ['abbonamento palestra rinnovo', 'scadenza'],
  ['f24 pagamento', 'scadenza'],
  ['bolletta luce', 'scadenza'],
  ['affitto', 'scadenza'],
  ['canone internet', 'scadenza'],
  ['scadenza revisione', 'scadenza'],
  // altro
  ['compleanno nonna', 'altro'],
  ['cena da amici', 'altro'],
  ['cinema', 'altro'],
  ['gita al mare', 'altro'],
  ['festa di laurea', 'altro'],
  ['partita di calcio', 'altro'],
  ['saggio di danza', 'altro'],
  ['pranzo domenica', 'altro'],
  ['concerto', 'altro'],
  ['vacanza', 'altro'],
];

/** Modello di partenza: solo esempi generici, nessun dato dell'utente. */
export function seedModel(seedWeight = 1): NbModel {
  const m = createModel();
  for (const [t, l] of SEED_EXAMPLES) {
    train(m, t, l, seedWeight, false);
  }
  return m;
}

export interface Feedback {
  text: string;
  label: string;
  corrected: boolean;
}

/** Peso di un esempio dell'utente rispetto a uno di partenza: una correzione è un segnale forte, una conferma più lieve. */
export const FEEDBACK_WEIGHT = { corrected: 4, confirmed: 2 };

/** Modello = esempi di partenza + correzioni e conferme registrate (in ordine cronologico). */
export interface BuildOptions {
  seedWeight?: number;
  corrected?: number;
  confirmed?: number;
}
export function buildModel(feedback: Feedback[], o: BuildOptions = {}): NbModel {
  const m = seedModel(o.seedWeight ?? 1);
  for (const f of feedback) {
    train(
      m,
      f.text,
      f.label,
      f.corrected ? (o.corrected ?? FEEDBACK_WEIGHT.corrected) : (o.confirmed ?? FEEDBACK_WEIGHT.confirmed),
      true,
    );
  }
  return m;
}

// ------------------------------------------------------------------ scelta tra regole e modello
export interface ChooseArgs {
  text: string;
  /** label deciso dalle regole del parser, se ne ha riconosciuto uno («altro» o null = non riconosciuto) */
  ruleLabel: string | null;
  /** le regole hanno riconosciuto una categoria personalizzata con le parole chiave dell'utente: non si discute */
  ruleIsCustom?: boolean;
  model: NbModel;
  /** label disponibili in questo spazio */
  allowed: string[];
  /** quante correzioni/conferme servono prima di fidarsi del modello sopra le regole */
  minUserExamples?: number;
  /** probabilità minima per scavalcare una categoria riconosciuta dalle regole */
  overrideThreshold?: number;
  /** probabilità minima per riempire una categoria che le regole non hanno riconosciuto */
  fillThreshold?: number;
  tempScale?: number;
  alpha?: number;
}

export interface Choice {
  label: string | null;
  source: 'rules' | 'model' | 'none';
  prob?: number;
  prediction?: NbPrediction;
}

/**
 * Parametri scelti con una ricerca a griglia su 648 combinazioni (suddivisioni 1000–1011 del dataset sintetico) e verificati su
 * suddivisioni mai usate per scegliere (2000–2011): tra le migliori configurazioni, +11 punti sulle regole da sole in entrambi i casi.
 */
export const DEFAULTS = {
  minUserExamples: 3,
  overrideThreshold: 0.8,
  fillThreshold: 0.35,
  tempScale: 0.6,
  alpha: 0.2,
};

/**
 * Le regole restano la prima linea (precise sui casi chiari); il modello interviene quando ha imparato dall'uso:
 *  - parole chiave personalizzate dell'utente → sempre regole;
 *  - regole sicure ma l'uso insegna altro (probabilità alta) → modello;
 *  - regole mute («altro») e il modello è abbastanza sicuro → modello.
 */
interface Thresholds {
  minUserExamples: number;
  override: number;
  fill: number;
}

const thresholdsOf = (a: ChooseArgs): Thresholds => ({
  minUserExamples: a.minUserExamples ?? DEFAULTS.minUserExamples,
  override: a.overrideThreshold ?? DEFAULTS.overrideThreshold,
  fill: a.fillThreshold ?? DEFAULTS.fillThreshold,
});

const fromModel = (prediction: NbPrediction): Choice => ({
  label: prediction.label,
  source: 'model',
  prob: prediction.prob,
  prediction,
});

const fromRules = (label: string | null, prediction: NbPrediction): Choice => ({
  label,
  source: label ? 'rules' : 'none',
  prediction,
});

/** L'uso ha insegnato altro rispetto a una regola sicura, e il modello è molto sicuro. */
const overridesRule = (p: NbPrediction, ruled: string, trusted: boolean, t: Thresholds): boolean =>
  trusted && !!p.label && p.label !== ruled && p.prob >= t.override;

/**
 * Le regole non hanno riconosciuto nulla: il modello riempie il campo se è abbastanza sicuro.
 * Finché non ha imparato dall'uso deve essere quasi certo (soglia 0.9) per riempire un campo che le regole lasciano vuoto.
 */
const fillsEmpty = (p: NbPrediction, trusted: boolean, t: Thresholds): boolean =>
  !!p.label && p.label !== 'altro' && p.prob >= (trusted ? t.fill : Math.max(t.fill, 0.9));

export function chooseCategory(a: ChooseArgs): Choice {
  const t = thresholdsOf(a);
  const prediction = predict(a.model, a.text, {
    labels: a.allowed,
    tempScale: a.tempScale ?? DEFAULTS.tempScale,
    alpha: a.alpha ?? DEFAULTS.alpha,
  });
  const ruled = a.ruleLabel && a.ruleLabel !== 'altro' ? a.ruleLabel : null;
  const trusted = a.model.userExamples >= t.minUserExamples;

  if (ruled && a.ruleIsCustom) {
    return fromRules(ruled, prediction);
  }
  if (ruled) {
    return overridesRule(prediction, ruled, trusted, t)
      ? fromModel(prediction)
      : fromRules(ruled, prediction);
  }
  return fillsEmpty(prediction, trusted, t) ? fromModel(prediction) : fromRules(a.ruleLabel, prediction);
}
