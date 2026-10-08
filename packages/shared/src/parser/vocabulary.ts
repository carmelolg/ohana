import type { BuiltinCategory } from '../types';

export const NUMWORDS: Record<string, number> = {
  un: 1,
  uno: 1,
  una: 1,
  due: 2,
  tre: 3,
  quattro: 4,
  cinque: 5,
  sei: 6,
  sette: 7,
  otto: 8,
  nove: 9,
  dieci: 10,
};

export const WEEKDAY_PATTERN =
  'lunedì|lunedi|martedì|martedi|mercoledì|mercoledi|giovedì|giovedi|venerdì|venerdi|sabato|domenica';

export const CATEGORY_WORDS: [BuiltinCategory, RegExp][] = [
  [
    'visita',
    /\b(visita|dottor\w*|dott\.?|medic\w*|cardiolog\w*|oculist\w*|dentist\w*|ecograf\w*|analisi|esame|ecg|radiograf\w*|risonanza|fisioterap\w*|vaccin\w*|ricetta|ospedale|ambulatorio|terapia)\b/i,
  ],
  [
    'professionista',
    /\b(idraulic\w*|elettricist\w*|avvocat\w*|commercialist\w*|notaio|geometra|imbianchin\w*|fabbro|meccanic\w*|caldaia|tecnico|architett\w*)\b/i,
  ],
  [
    'burocrazia',
    /\b(comune|anagrafe|inps|asl|documento|carta d'identit\w*|patente|passaporto|certificat\w*|catasto|agenzia delle entrate|spid|tessera sanitaria)\b/i,
  ],
  [
    'scadenza',
    /\b(bolletta|bollo|revisione|assicurazione|tassa|imu|tari|scadenza|affitto|rata|mutuo|canone|abbonamento|f24|730)\b/i,
  ],
  ['commissione', /\b(ritirare|ritiro|comprare|posta|farmacia|banca|consegna\w*|pacco|portare|prendere)\b/i],
];

export const CHORE_RE =
  /\b(plastica|umido|vetro|indifferenziat\w*|rifiuti|spazzatura|immondizia|annaffia\w*|piante|lavatrice|lavastoviglie|bucato|stira\w*|pulizi\w*|pulire|aspirapolvere|lettiera|lenzuola|portare fuori|buttare|svuotare|raccolta differenziata)\b/;

/** Per questi modelli serve anche un verbo di pratica, altrimenti «scadenza carta d'identità» sarebbe una pratica. */
export const NEEDS_VERB = new Set(['carta_identita', 'patente']);

/** Interpreta un numero scritto in cifre o in lettere («3», «tre»). */
export const parseCount = (word: string): number =>
  /^\d+$/.test(word) ? Number(word) : NUMWORDS[word.toLowerCase()];
