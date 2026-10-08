import { parseMoneyInput } from '@ohana/shared';
import { uploadAttachmentToEvent } from '../../lib/files';
import type { Mutate } from '../../lib/data';
import { newId } from '../../lib/outbox';
import type { ChecklistItem, EventRow } from '../../lib/types';
import type { LocationValue } from '../../components/LocationField';
import { channelsOf, type ReminderDraft } from './reminders';

/** Tutto ciò che serve a salvare un impegno, già validato dalla schermata. */
export interface EventToSave {
  existing: EventRow | null;
  userId: string;
  spaceId: string;
  title: string;
  categoryId: string;
  startsAt: Date;
  isChore: boolean;
  assigneeId: string | null;
  contactId: string | null;
  rrule: string;
  location: LocationValue;
  notes: string;
  amount: string;
  reminders: ReminderDraft[];
  checklist: ChecklistItem[];
  files: File[];
  /** Prossimo passo del diario visite da collegare al nuovo impegno. */
  followUpId: string | null;
}

export interface SaveResult {
  eventId: string;
  /** Allegati che non è stato possibile caricare (offline). */
  failedUploads: string[];
}

function eventRow(e: EventToSave, id: string) {
  const place = e.location.text.trim();
  return {
    id,
    space_id: e.spaceId,
    title: e.title,
    ...(e.categoryId ? { category_id: e.categoryId } : {}),
    starts_at: e.startsAt.toISOString(),
    kind: e.isChore ? 'faccenda' : 'appuntamento',
    all_day: e.isChore,
    location: place || null,
    location_lat: place ? e.location.lat : null,
    location_lng: place ? e.location.lng : null,
    notes: e.notes.trim() || null,
    assignee_id: e.assigneeId,
    contact_id: e.isChore ? null : e.contactId,
    rrule: e.rrule || null,
    amount: parseMoneyInput(e.amount),
    ...(e.existing ? {} : { created_by: e.userId }),
  };
}

async function saveReminders(mutate: Mutate, eventId: string, e: EventToSave): Promise<void> {
  // le faccende non mandano email né promemoria: solo il riepilogo push delle 8:00
  const rows = (e.isChore ? [] : e.reminders)
    .map((r) => ({ id: newId(), event_id: eventId, offset_minutes: r.offset, channels: channelsOf(r) }))
    .filter((r) => r.channels.length > 0);
  if (rows.length) {
    await mutate({ table: 'event_reminders', action: 'upsert', payload: rows });
  }
}

async function saveChecklist(mutate: Mutate, eventId: string, items: ChecklistItem[]): Promise<void> {
  const rows = items
    .filter((c) => c.text.trim())
    .map((c, position) => ({
      id: newId(),
      event_id: eventId,
      text: c.text.trim(),
      checked: c.checked,
      position,
    }));
  if (rows.length) {
    await mutate({ table: 'event_checklist_items', action: 'upsert', payload: rows });
  }
}

async function saveAttachments(mutate: Mutate, eventId: string, e: EventToSave): Promise<string[]> {
  const failed: string[] = [];
  for (const file of e.files) {
    let path: string;
    try {
      ({ path } = await uploadAttachmentToEvent(e.spaceId, eventId, file));
    } catch {
      failed.push(file.name);
      continue;
    }
    await mutate({
      table: 'attachments',
      action: 'upsert',
      payload: { id: newId(), event_id: eventId, path, name: file.name },
    });
  }
  return failed;
}

/**
 * Salva l'impegno con promemoria, checklist e allegati.
 * In modifica promemoria e checklist vengono riscritti da zero. Gli errori della scrittura principale si propagano.
 */
export async function saveEvent(mutate: Mutate, e: EventToSave): Promise<SaveResult> {
  const eventId = e.existing?.id ?? newId();
  const row = eventRow(e, eventId);
  if (e.existing) {
    const { id: _id, ...changes } = row;
    await mutate({ table: 'events', action: 'update', payload: changes, match: { id: eventId } });
    await mutate({ table: 'event_reminders', action: 'delete', match: { event_id: eventId } });
    await mutate({ table: 'event_checklist_items', action: 'delete', match: { event_id: eventId } });
  } else {
    await mutate({ table: 'events', action: 'upsert', payload: row });
  }
  await saveReminders(mutate, eventId, e);
  await saveChecklist(mutate, eventId, e.checklist);
  const failedUploads = await saveAttachments(mutate, eventId, e);
  if (e.followUpId && !e.existing) {
    await mutate({
      table: 'follow_ups',
      action: 'update',
      payload: { created_event_id: eventId },
      match: { id: e.followUpId },
    });
  }
  return { eventId, failedUploads };
}
