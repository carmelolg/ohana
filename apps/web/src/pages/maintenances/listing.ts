import { useEffect } from 'react';
import type { SetURLSearchParams } from 'react-router-dom';
import { findMaintenanceTemplate, MAINTENANCE_TEMPLATES } from '@ohana/shared';
import { nextDue } from '../../lib/data';
import type { Maintenance } from '../../lib/types';
import type { FormState } from './MaintenanceForm';

/** Manutenzioni dello spazio scelto con la prossima scadenza, dalla più vicina (senza scadenza in fondo). */
export function sortByDue(list: Maintenance[], selected: string): { m: Maintenance; due: Date | null }[] {
  return list
    .filter((m) => selected === 'all' || m.space_id === selected)
    .map((m) => ({ m, due: nextDue(m) }))
    .sort((a, b) => (a.due?.getTime() ?? Infinity) - (b.due?.getTime() ?? Infinity));
}

/** Dal «+» con testo libero (?nuova=…): apre il modulo già compilato e ripulisce l'indirizzo. */
export function useOpenFromQuery(
  params: URLSearchParams,
  setParams: SetURLSearchParams,
  open: (state: FormState) => void,
) {
  useEffect(() => {
    const key = params.get('nuova');
    if (!key) {
      return;
    }
    const template = findMaintenanceTemplate(key) ?? MAINTENANCE_TEMPLATES[MAINTENANCE_TEMPLATES.length - 1];
    open({
      mode: 'new',
      template,
      text: params.get('text') ?? '',
      rrule: params.get('rrule') || undefined,
    });
    setParams({}, { replace: true });
  }, [params, setParams, open]);
}
