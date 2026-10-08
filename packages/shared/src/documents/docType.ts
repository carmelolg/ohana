import { DOC_TYPE_LABEL, type DocType } from './types';

const TYPE_RULES: [DocType, RegExp[]][] = [
  [
    'multa',
    [
      /verbale/,
      /violazione/,
      /codice\s+della\s+strada/,
      /contravvenzione/,
      /infrazione/,
      /misura\s+ridotta/,
      /sanzione/,
      /\btarga\b/,
      /accertamento/,
    ],
  ],
  [
    'ricetta',
    [
      /ricetta/,
      /prescrizione/,
      /\bssn\b/,
      /\bnre\b/,
      /impegnativa/,
      /posologia/,
      /farmac/,
      /medicinal/,
      /esenzione/,
      /ticket/,
    ],
  ],
  [
    'referto',
    [
      /referto/,
      /\besito\b/,
      /diagnosi/,
      /reparto/,
      /laboratorio/,
      /ecograf/,
      /risonanza/,
      /radiograf/,
      /\bdott\b|\bdr\b|\bdott\.ssa/,
      /conclusioni/,
      /anamnesi/,
      /campione/,
      /valori/,
      /\bparametri\b/,
      /visita\s+(?:specialistica|cardiologica|oculistica)/,
    ],
  ],
  [
    'bolletta',
    [
      /bolletta/,
      /fornitura/,
      /kwh/,
      /\bsmc\b/,
      /\bpod\b/,
      /\bpdr\b/,
      /consumi/,
      /periodo\s+di\s+fatturazione/,
      /energia\s+elettrica/,
      /gas\s+naturale/,
      /servizio\s+idrico/,
      /codice\s+cliente|numero\s+cliente/,
      /canone/,
      /fattura\b/,
    ],
  ],
  [
    'condominio',
    [
      /condomin/,
      /amministrator/,
      /assemblea/,
      /convocazione/,
      /millesim/,
      /rata\s+condominiale/,
      /spese\s+condominiali/,
    ],
  ],
];

export function detectType(low: string): { type: DocType; sure: boolean } {
  let best: DocType = 'altro';
  let bestScore = 0;
  for (const [type, rules] of TYPE_RULES) {
    const score = rules.filter((r) => r.test(low)).length;
    if (score > bestScore) {
      best = type;
      bestScore = score;
    }
  }
  return { type: best, sure: bestScore >= 2 || (bestScore === 1 && best !== 'altro') };
}

export function labelFor(type: DocType, low: string): string {
  if (type !== 'bolletta') {
    return DOC_TYPE_LABEL[type];
  }
  if (/energia\s+elettrica|kwh|\bpod\b|\bluce\b/.test(low)) {
    return 'Bolletta luce';
  }
  if (/gas\s+naturale|\bsmc\b|\bpdr\b|\bgas\b/.test(low)) {
    return 'Bolletta gas';
  }
  if (/servizio\s+idrico|\bacqua\b|\bmc\b/.test(low)) {
    return 'Bolletta acqua';
  }
  if (/telefon|internet|fibra|linea\s+mobile|\bsim\b|\badsl\b/.test(low)) {
    return 'Bolletta telefono';
  }
  return 'Bolletta';
}
