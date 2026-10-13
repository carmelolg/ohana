import { overridesAfterEdit, parseMoneyInput } from '@ohana/shared';
import { uploadAttachmentToEvent } from '../../lib/files';
import type { Mutate } from '../../lib/data';
import { newId } from '../../lib/outbox';
import type { ChecklistItem, EventRow } from '../../lib/types';
import type { LocationValue } from '../../components/LocationField';
import { linkColumns } from './eventLink';
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
  /** Filone di cura a cui appartiene l'impegno (vuoto = nessuno). */
  careThreadId: string | null;
  /** Pratica o manutenzione collegata (`procedure:<id>` / `maintenance:<id>`; vuoto = nessuna). */
  linkKey: string;
}

export interface SaveResult {
  eventId: string;
  /** Allegati che non è stato possibile caricare (offline). */
  failedUploads: string[];
}

/**
 * Un impegno importato: titolo, orario e ripetizione sono del calendario d'origine e non si scrivono. Luogo e note sì, ma
 * si segnano in `local_overrides` perché la prossima sincronizzazione non li riscriva.
 */
function importedRow(e: EventToSave, existing: EventRow) {
  const place = e.location.text.trim();
  const notes = e.notes.trim();
  return {
    ...(e.categoryId ? { category_id: e.categoryId } : {}),
    location: place || null,
    location_lat: place ? e.location.lat : null,
    location_lng: place ? e.location.lng : null,
    notes: notes || null,
    local_overrides: overridesAfterEdit(
      existing.local_overrides ?? [],
      { location: existing.location, notes: existing.notes },
      { location: place || null, notes: notes || null },
    ),
    assignee_id: e.assigneeId,
    contact_id: e.contactId,
    care_thread_id: e.careThreadId,
    ...linkColumns(e.linkKey),
    amount: parseMoneyInput(e.amount),
  };
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
    care_thread_id: e.isChore ? null : e.careThreadId,
    ...linkColumns(e.isChore ? '' : e.linkKey),
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

/** Scrive la riga dell'impegno: gli importati solo nei campi nostri, gli altri per intero. */
async function writeEventRow(mutate: Mutate, e: EventToSave, eventId: string): Promise<void> {
  if (e.existing?.import_id) {
    const payload = importedRow(e, e.existing);
    await mutate({ table: 'events', action: 'update', payload, match: { id: eventId } });
    return;
  }
  const row = eventRow(e, eventId);
  if (!e.existing) {
    await mutate({ table: 'events', action: 'upsert', payload: row });
    return;
  }
  const { id: _id, ...changes } = row;
  await mutate({ table: 'events', action: 'update', payload: changes, match: { id: eventId } });
}

/**
 * Salva l'impegno con promemoria, checklist e allegati.
 * In modifica promemoria e checklist vengono riscritti da zero. Gli errori della scrittura principale si propagano.
 */
export async function saveEvent(mutate: Mutate, e: EventToSave): Promise<SaveResult> {
  const eventId = e.existing?.id ?? newId();
  await writeEventRow(mutate, e, eventId);
  if (e.existing) {
    await mutate({ table: 'event_reminders', action: 'delete', match: { event_id: eventId } });
    await mutate({ table: 'event_checklist_items', action: 'delete', match: { event_id: eventId } });
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
