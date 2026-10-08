import { isoDayRome, parseMoneyInput, parseQuick } from '@ohana/shared';
import type { Mutate } from '../../lib/data';
import { fromDateInput } from '../../lib/date-input';
import { newId } from '../../lib/outbox';
import type { EventRow, FollowUp } from '../../lib/types';

export async function addVisitNote(
  mutate: Mutate,
  eventId: string,
  authorId: string,
  text: string,
): Promise<void> {
  await mutate({
    table: 'visit_notes',
    action: 'upsert',
    payload: { id: newId(), event_id: eventId, author_id: authorId, text },
  });
}

export async function deleteVisitNote(mutate: Mutate, id: string): Promise<void> {
  await mutate({ table: 'visit_notes', action: 'delete', match: { id } });
}

/** Prossimo passo con una scadenza indicativa in testo libero («entro 31 dic»): se il parser la capisce, diventa anche una data. */
export async function addFollowUp(
  mutate: Mutate,
  eventId: string,
  title: string,
  hint: string,
): Promise<void> {
  const cleanHint = hint.trim();
  const when = cleanHint ? parseQuick(cleanHint, new Date()).startsAt : null;
  await mutate({
    table: 'follow_ups',
    action: 'upsert',
    payload: {
      id: newId(),
      event_id: eventId,
      title,
      due_hint: cleanHint || null,
      due_date: when ? isoDayRome(when) : null,
    },
  });
}

export async function deleteFollowUp(mutate: Mutate, id: string): Promise<void> {
  await mutate({ table: 'follow_ups', action: 'delete', match: { id } });
}

/** Registra l'importo del ticket sull'impegno, pronto per essere diviso nelle Spese. Restituisce `false` se l'importo non è valido. */
export async function saveTicketAmount(mutate: Mutate, eventId: string, text: string): Promise<boolean> {
  const amount = parseMoneyInput(text);
  if (amount === null || amount <= 0) {
    return false;
  }
  await mutate({ table: 'events', action: 'update', payload: { amount }, match: { id: eventId } });
  return true;
}

interface ReminderTarget {
  visit: EventRow;
  followUp: FollowUp;
  /** `YYYY-MM-DD` scelto dall'utente. */
  date: string;
  userId: string;
  /** Categoria «Altro» dello spazio, se esiste. */
  categoryId: string | undefined;
}

/** Trasforma un prossimo passo in un impegno senza ora precisa (alle 9:00), con avviso all'ora stessa. Restituisce `false` se la data non è valida. */
export async function createFollowUpReminder(
  mutate: Mutate,
  { visit, followUp, date, userId, categoryId }: ReminderTarget,
): Promise<boolean> {
  const at = fromDateInput(date);
  if (!at) {
    return false;
  }
  const eventId = newId();
  await mutate({
    table: 'events',
    action: 'upsert',
    payload: {
      id: eventId,
      space_id: visit.space_id,
      title: followUp.title,
      ...(categoryId ? { category_id: categoryId } : {}),
      starts_at: at.toISOString(),
      contact_id: visit.contact_id,
      assignee_id: visit.assignee_id,
      created_by: userId,
    },
  });
  await mutate({
    table: 'event_reminders',
    action: 'upsert',
    payload: { id: newId(), event_id: eventId, offset_minutes: 0, channels: ['email', 'push'] },
  });
  await mutate({
    table: 'follow_ups',
    action: 'update',
    payload: { created_event_id: eventId, due_date: date },
    match: { id: followUp.id },
  });
  return true;
}
