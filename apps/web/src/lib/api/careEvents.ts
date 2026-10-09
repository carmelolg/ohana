import type { Mutate } from '../data';
import { newId } from '../outbox';
import type { Category } from '../types';

/** Categoria predefinita (per slug) di uno spazio: serve a creare impegni nella categoria giusta. */
export function categoryIdOf(categories: Category[], spaceId: string, slug: string): string | undefined {
  return categories.find((c) => c.space_id === spaceId && c.slug === slug)?.id;
}

export interface CareEventToSave {
  id?: string;
  spaceId: string;
  title: string;
  startsAt: Date;
  categoryId: string | undefined;
  assigneeId: string | null;
  notes?: string;
  contactId?: string | null;
  careThreadId?: string | null;
  medicationId?: string | null;
  /** Quanto prima avvisare, in minuti (0 = al momento). */
  remindBeforeMinutes?: number;
}

/**
 * Un impegno nato dalla Cura (ricetta da chiedere, piano in scadenza, prossimo controllo): è un impegno normale,
 * quindi compare in Oggi e nel calendario, con un promemoria. Restituisce l'id.
 */
export async function createCareEvent(mutate: Mutate, e: CareEventToSave): Promise<string> {
  const id = e.id ?? newId();
  await mutate({
    table: 'events',
    action: 'upsert',
    payload: {
      id,
      space_id: e.spaceId,
      title: e.title,
      ...(e.categoryId ? { category_id: e.categoryId } : {}),
      starts_at: e.startsAt.toISOString(),
      assignee_id: e.assigneeId,
      notes: e.notes?.trim() || null,
      contact_id: e.contactId ?? null,
      care_thread_id: e.careThreadId ?? null,
      medication_id: e.medicationId ?? null,
    },
  });
  await mutate({
    table: 'event_reminders',
    action: 'upsert',
    payload: {
      id: newId(),
      event_id: id,
      offset_minutes: e.remindBeforeMinutes ?? 0,
      channels: ['email', 'push'],
    },
  });
  return id;
}
