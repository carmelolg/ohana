import { extractReadings, isoDayRome } from '@ohana/shared';
import type { Mutate } from '../data';
import { newId } from '../outbox';
import type { CareThread } from '../types';
import { parseReadings } from './careVisit';

export interface ReportToCare {
  thread: Pick<CareThread, 'id' | 'space_id' | 'recipient_id'>;
  title: string;
  /** Testo letto dall'OCR: da qui si ricavano i valori. */
  text: string;
  date: Date;
  file: File;
  /** Carica il referto tra gli allegati sanitari (richiede la rete); iniettabile per provare il caso d'uso senza rete. */
  upload: (entryId: string, file: File) => Promise<unknown>;
}

/** Un referto scansionato diventa un tassello «esame» del filone, con i valori letti e il file allegato. */
export async function saveReportToCare(mutate: Mutate, r: ReportToCare): Promise<string> {
  const entryId = newId();
  await mutate({
    table: 'care_entries',
    action: 'upsert',
    payload: {
      id: entryId,
      space_id: r.thread.space_id,
      recipient_id: r.thread.recipient_id,
      thread_id: r.thread.id,
      type: 'esame',
      entry_date: isoDayRome(r.date),
      title: r.title.trim() || 'Referto',
      text: null,
      readings: parseReadings(extractReadings(r.text)),
    },
  });
  await r.upload(entryId, r.file);
  return entryId;
}
