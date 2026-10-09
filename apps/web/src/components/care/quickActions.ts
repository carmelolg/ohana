import { CARE_PARAMS, PARAM_KEYS, isParamKey, type ParamKey } from '@ohana/shared';
import type { CareThread } from '../../lib/types';

export type QuickAction =
  | { id: string; label: string; kind: 'measure'; param: ParamKey; threadId: string | null }
  | { id: string; label: string; kind: 'episode'; threadId: string; title: string };

const MEASURE_LABEL: Record<ParamKey, string> = {
  heart_rate: 'Freq. cardiaca',
  blood_pressure: 'Misura pressione',
  weight: 'Peso',
  stools_per_day: 'Scariche',
};

/**
 * I pulsanti «Registra ora» di una persona (4e): un parametro per ogni valore monitorato dai suoi filoni attivi
 * (tutti, se nessun filone ne monitora uno), più un episodio per filone.
 */
export function quickActions(threads: CareThread[]): QuickAction[] {
  const active = threads.filter((t) => t.status === 'attivo');
  const tracked = [...new Set(active.flatMap((t) => t.tracked_params))].filter(isParamKey);
  const params = tracked.length ? tracked : PARAM_KEYS;
  const measures: QuickAction[] = params.map((param) => ({
    id: `misura:${param}`,
    label: MEASURE_LABEL[param],
    kind: 'measure',
    param,
    threadId: active.find((t) => t.tracked_params.includes(param))?.id ?? null,
  }));
  const episodes: QuickAction[] = active.map((t) => ({
    id: `episodio:${t.id}`,
    label: `Episodio · ${t.title}`,
    kind: 'episode',
    threadId: t.id,
    title: t.title,
  }));
  return [...measures, ...episodes];
}

export const paramUnit = (param: ParamKey): string => CARE_PARAMS[param].unit;
