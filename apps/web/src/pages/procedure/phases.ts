import { formatEuro, toCents } from '@ohana/shared';
import type { ProcedureStep } from '../../lib/types';

/** La prima fase non ancora fatta, nell'ordine dell'iter. */
export const nextStep = (steps: ProcedureStep[]): ProcedureStep | undefined => steps.find((s) => !s.done_at);

/** Le fasi che sono preventivi messi a confronto (hanno un esito). */
export const quotesOf = (steps: ProcedureStep[]): ProcedureStep[] =>
  steps.filter((s) => s.quote_outcome !== null);

/** Importo totale delle fasi con un importo non scartato, in centesimi (mai somme di float). */
export function totalCents(steps: ProcedureStep[]): number {
  return steps
    .filter((s) => s.amount !== null && s.quote_outcome !== 'scartato')
    .reduce((sum, s) => sum + toCents(s.amount ?? 0), 0);
}

/** «Segna fatto: Richiesta primo preventivo»; vuoto se tutte le fasi sono fatte. */
export function advanceLabel(steps: ProcedureStep[]): string {
  const next = nextStep(steps);
  return next ? `Segna fatto: ${next.title}` : '';
}

/** «3.200 €» senza decimali inutili. */
export const euroShort = (amount: number): string => formatEuro(amount).replace(',00', '');
