import type { ParsedEvent, ParsedKind, SpaceFeature } from '@ohana/shared';

export interface Option {
  kind: ParsedKind;
  badge: string;
  title: string;
  sub: string;
}

const IMPEGNO: Option = {
  kind: 'appuntamento',
  badge: 'IM',
  title: 'Impegno',
  sub: 'Visita, professionista, commissione',
};
const MANUTENZIONE: Option = {
  kind: 'manutenzione',
  badge: 'MA',
  title: 'Manutenzione',
  sub: 'Diventa una scadenza ricorrente',
};
const OTHERS: Option[] = [
  {
    kind: 'faccenda',
    badge: 'FA',
    title: 'Faccenda ricorrente',
    sub: 'Assegnata a una persona, senza orario',
  },
  {
    kind: 'scansione',
    badge: 'SC',
    title: 'Scansiona documento',
    sub: 'Bolletta, referto, ricetta → scadenza o allegato',
  },
  { kind: 'pratica', badge: 'PR', title: 'Pratica', sub: 'ISEE, 730, rinnovi: passaggi e documenti' },
  { kind: 'nota', badge: 'NO', title: 'Nota in bacheca', sub: 'Visibile in alto a tutto lo spazio' },
];

/** Funzione che una voce richiede: se lo spazio la spegne, la voce non compare nel «+». */
const REQUIRES: Partial<Record<ParsedKind, SpaceFeature>> = {
  manutenzione: 'manutenzioni',
  scansione: 'documenti',
  pratica: 'pratiche',
};

/** Le voci del «+»; «Manutenzione» compare, subito dopo «Impegno», solo quando il testo la fa riconoscere. */
export function optionsFor(
  detected: ParsedKind | null,
  isOn: (feature: SpaceFeature) => boolean = () => true,
): Option[] {
  const all = detected === 'manutenzione' ? [IMPEGNO, MANUTENZIONE, ...OTHERS] : [IMPEGNO, ...OTHERS];
  return all.filter((o) => {
    const needed = REQUIRES[o.kind];
    return !needed || isOn(needed);
  });
}

export type Destination = { type: 'note'; text: string } | { type: 'route'; to: string };

const query = (params: Record<string, string>) =>
  new URLSearchParams(Object.entries(params).filter(([, value]) => value)).toString();

type Builder = (text: string, parsed: ParsedEvent | null) => Destination;

const route = (to: string): Destination => ({ type: 'route', to });

const DESTINATIONS: Partial<Record<ParsedKind, Builder>> = {
  nota: (text, parsed) => ({ type: 'note', text: parsed?.noteText ?? text }),
  scansione: () => route('/scansiona'),
  faccenda: (text) => route(`/nuovo?${query({ tipo: 'faccenda', text })}`),
  manutenzione: (text, parsed) =>
    route(
      `/manutenzioni?${query({ nuova: parsed?.templateKey ?? 'custom', text, rrule: parsed?.rrule ?? '' })}`,
    ),
  pratica: (text, parsed) =>
    route(`/pratiche?${query({ nuova: parsed?.templateKey ?? 'custom', text: parsed?.title ?? text })}`),
};

const toEvent: Builder = (text) => route(`/nuovo${text ? `?${query({ text })}` : ''}`);

/** Dove porta ciascuna voce, con il testo scritto già pronto da precompilare. */
export function destinationFor(kind: ParsedKind, typed: string, parsed: ParsedEvent | null): Destination {
  return (DESTINATIONS[kind] ?? toEvent)(typed.trim(), parsed);
}
