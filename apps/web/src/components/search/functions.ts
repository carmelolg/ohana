import { normalizeText, type SpaceFeature } from '@ohana/shared';

export interface AppFunction {
  label: string;
  to: string;
  keywords: string;
  feature?: SpaceFeature;
}

/** Le funzioni dell'app raggiungibili dalla ricerca; quelle spente nello spazio non compaiono. */
const FUNCTIONS: AppFunction[] = [
  { label: 'Spesa', to: '/spesa', keywords: 'lista supermercato', feature: 'spesa' },
  { label: 'Spese', to: '/spese', keywords: 'saldo soldi pagato', feature: 'spese' },
  { label: 'Scadenze', to: '/scadenze', keywords: 'bollette bolli rinnovi' },
  { label: 'Manutenzioni', to: '/manutenzioni', keywords: 'caldaia gomme', feature: 'manutenzioni' },
  { label: 'Documenti', to: '/documenti', keywords: 'referti garanzie', feature: 'documenti' },
  { label: 'Scansiona documento', to: '/scansiona', keywords: 'foto ocr', feature: 'documenti' },
  { label: 'Pratiche', to: '/pratiche', keywords: 'isee 730 patente', feature: 'pratiche' },
  { label: 'Cura', to: '/cura', keywords: 'terapie genitori salute', feature: 'cura' },
  { label: 'Bacheca', to: '/bacheca', keywords: 'note messaggi avvisi' },
  { label: 'Rubrica', to: '/rubrica', keywords: 'contatti numeri' },
  { label: 'Emergenza', to: '/emergenza', keywords: '112 urgenza' },
  { label: 'Impostazioni', to: '/impostazioni', keywords: 'profilo notifiche tema' },
];

export function searchFunctions(query: string, isOn: (feature: SpaceFeature) => boolean): AppFunction[] {
  const n = normalizeText(query);
  if (!n) {
    return [];
  }
  return FUNCTIONS.filter((f) => !f.feature || isOn(f.feature)).filter((f) =>
    normalizeText(`${f.label} ${f.keywords}`).includes(n),
  );
}
