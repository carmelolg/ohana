import type { Mutate } from '../data';
import type { CareEntry } from '../types';

/** La visita chiusa e le scadenze che ha generato: si spostano insieme al filone. */
export interface VisitRecord {
  entryId: string;
  recipientId: string;
  threadId: string;
  /** Impegni creati dai prossimi passi (scadenze e prossimo controllo). */
  followUpEventIds: string[];
}

export type VisitEntry = Pick<CareEntry, 'id' | 'recipient_id' | 'thread_id' | 'follow_ups'>;

export function visitRecordOf(entry: VisitEntry): VisitRecord {
  return {
    entryId: entry.id,
    recipientId: entry.recipient_id,
    threadId: entry.thread_id,
    followUpEventIds: entry.follow_ups.flatMap((f) => (f.event_id ? [f.event_id] : [])),
  };
}

/**
 * Sposta una visita in un altro filone, anche di un'altra persona: tassello, file del referto e scadenze.
 * Se restassero nel filone vecchio, la visita comparirebbe ancora lì.
 */
export async function moveVisitToThread(
  mutate: Mutate,
  visit: VisitRecord,
  target: { threadId: string; recipientId: string },
): Promise<void> {
  await mutate({
    table: 'care_entries',
    action: 'update',
    payload: { thread_id: target.threadId, recipient_id: target.recipientId },
    match: { id: visit.entryId },
  });
  // i file seguono la persona: la RLS li mostra in base a `recipient_id`
  if (target.recipientId !== visit.recipientId) {
    await mutate({
      table: 'care_files',
      action: 'update',
      payload: { recipient_id: target.recipientId },
      match: { entry_id: visit.entryId },
    });
  }
  for (const eventId of visit.followUpEventIds) {
    await mutate({
      table: 'events',
      action: 'update',
      payload: { care_thread_id: target.threadId },
      match: { id: eventId },
    });
  }
}
