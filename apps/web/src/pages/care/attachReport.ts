import { isoDayRome } from '@ohana/shared';
import { addEntry } from '../../lib/api/care';
import { uploadCareFile } from '../../lib/api/careFiles';
import type { CareReminderEvent, Mutate } from '../../lib/data';
import { newId } from '../../lib/outbox';
import type { CareThread } from '../../lib/types';

/** Cosa riceverà il referto: un tassello già registrato o un impegno senza esito. */
export type ReportTarget =
  { kind: 'entry'; entryId: string; title: string } | { kind: 'event'; event: CareReminderEvent };

/** Una visita si chiude con l'esito (referto compreso); ogni altro impegno è trattato come un esame. */
export const isVisitEvent = (event: CareReminderEvent): boolean => event.categories?.slug === 'visita';

/**
 * Allega i referti a un tassello esistente, oppure — per un esame già in calendario — crea prima il tassello
 * «Esame» legato all'impegno e poi vi allega i file. Restituisce i nomi dei file non caricati (offline):
 * il tassello resta, così si può riprovare.
 */
export async function attachReports(
  mutate: Mutate,
  thread: CareThread,
  target: ReportTarget,
  files: File[],
): Promise<string[]> {
  let entryId: string;
  if (target.kind === 'entry') {
    entryId = target.entryId;
  } else {
    entryId = newId();
    await addEntry(mutate, {
      id: entryId,
      spaceId: thread.space_id,
      recipientId: thread.recipient_id,
      threadId: thread.id,
      type: 'esame',
      date: isoDayRome(new Date(target.event.starts_at)),
      title: target.event.title,
      text: '',
      eventId: target.event.id,
    });
  }
  const failed: string[] = [];
  for (const file of files) {
    try {
      await uploadCareFile({ spaceId: thread.space_id, recipientId: thread.recipient_id, entryId, file });
    } catch {
      failed.push(file.name);
    }
  }
  return failed;
}
