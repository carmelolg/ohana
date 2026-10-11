import { useMemo } from 'react';
import { addDaysRome, startOfDayRome } from '@ohana/shared';
import { collectDeadlines, type Deadline } from '../deadlines';
import { toOccurrences, useEvents } from './events';
import { useDocuments, useMaintenances, useProcedures } from './household';
import { useSpace } from './spaces';

/** Scadenze dello spazio in vista nei prossimi `days` giorni, in ordine di data. */
export function useDeadlines(days: number): { deadlines: Deadline[]; from: Date } {
  const { selected } = useSpace();
  const from = useMemo(() => startOfDayRome(new Date()), []);
  const to = useMemo(() => addDaysRome(from, days), [from, days]);
  const { data: events = [] } = useEvents(from, to);
  const { data: documents = [] } = useDocuments();
  const { data: maintenances = [] } = useMaintenances();
  const { data: procedures = [] } = useProcedures();
  const deadlines = useMemo(
    () =>
      collectDeadlines(
        { occurrences: toOccurrences(events, from, to, selected), documents, maintenances, procedures },
        (id) => selected === 'all' || id === selected,
        from,
      ),
    [events, documents, maintenances, procedures, selected, from, to],
  );
  return { deadlines, from };
}
