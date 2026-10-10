import { useMemo } from 'react';
import { openCareFile } from '../../lib/api/careFiles';
import type { CareReminderEvent } from '../../lib/data';
import { careRows } from '../../lib/timeline';
import type { CareEntry } from '../../lib/types';
import { TimelineList } from '../timeline/TimelineList';

const NO_EVENTS: CareReminderEvent[] = [];

interface Props {
  entries: CareEntry[];
  /** Impegni aperti del filone (visite, controlli): stanno nella stessa linea, in cima, finché non si registra l'esito. */
  upcoming?: CareReminderEvent[];
  hue: number;
  authorName: (id: string) => string;
  /** Anno corrente: gli anni diversi compaiono nella data. */
  year: number;
  /** Mostra solo le prime righe (colonna del desktop). */
  limit?: number;
}

/** Linea del tempo verticale di un filone (4b): tasselli e impegni in programma insieme. */
export function Timeline({ entries, upcoming = NO_EVENTS, hue, authorName, year, limit }: Props) {
  const rows = useMemo(
    () => careRows(entries, upcoming, { authorName, openFile: (path) => void openCareFile(path) }),
    [entries, upcoming, authorName],
  );
  return <TimelineList rows={rows} hue={hue} year={year} limit={limit} />;
}
