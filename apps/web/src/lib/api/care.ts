import type { Mutate } from '../data';
import { supabase } from '../supabase';
import type { CareExemption } from '../types';

// Persone assistite e filoni di cura. I campi `created_by`/`author_id` non si scrivono mai: li imposta il database
// con l'utente che scrive, così una modifica fatta da un altro non cambia l'autore originale.

export interface RecipientToSave {
  id: string;
  spaceId: string;
  firstName: string;
  lastName: string;
  label: string;
  birthDate: string | null;
  taxCode: string;
  allergies: string[];
  exemptions: CareExemption[];
  caregiverIds: string[];
  /** Caregiver di turno; vuoto = il primo dell'elenco. */
  dutyUserId: string | null;
  /** Membro di Ohana collegato alla scheda (facoltativo). */
  userId: string | null;
}

export const saveRecipient = (mutate: Mutate, r: RecipientToSave) =>
  mutate({
    table: 'care_recipients',
    action: 'upsert',
    payload: {
      id: r.id,
      space_id: r.spaceId,
      first_name: r.firstName.trim(),
      last_name: r.lastName.trim(),
      label: r.label.trim() || null,
      birth_date: r.birthDate || null,
      tax_code: r.taxCode.trim().toUpperCase() || null,
      allergies: r.allergies,
      exemptions: r.exemptions,
      caregiver_ids: r.caregiverIds,
      duty_user_id: r.dutyUserId && r.caregiverIds.includes(r.dutyUserId) ? r.dutyUserId : null,
      user_id: r.userId,
    },
  });

export const setDutyCaregiver = (mutate: Mutate, recipientId: string, userId: string | null) =>
  mutate({
    table: 'care_recipients',
    action: 'update',
    payload: { duty_user_id: userId },
    match: { id: recipientId },
  });

export const setRecipientPhoto = (mutate: Mutate, recipientId: string, path: string | null) =>
  mutate({
    table: 'care_recipients',
    action: 'update',
    payload: { photo_path: path },
    match: { id: recipientId },
  });

export const deleteRecipient = (mutate: Mutate, id: string) =>
  mutate({ table: 'care_recipients', action: 'delete', match: { id } });

export interface ThreadToSave {
  id: string;
  spaceId: string;
  recipientId: string;
  title: string;
  specialty: string;
  doctor: string;
  contactId: string | null;
  colorHue: number;
  startedAt: string | null;
  trackedParams: string[];
}

export const saveThread = (mutate: Mutate, t: ThreadToSave) =>
  mutate({
    table: 'care_threads',
    action: 'upsert',
    payload: {
      id: t.id,
      space_id: t.spaceId,
      recipient_id: t.recipientId,
      title: t.title.trim(),
      specialty: t.specialty.trim() || null,
      doctor: t.doctor.trim() || null,
      contact_id: t.contactId,
      color_hue: t.colorHue,
      started_at: t.startedAt || null,
      tracked_params: t.trackedParams,
    },
  });

export const setThreadStatus = (mutate: Mutate, id: string, status: 'attivo' | 'chiuso') =>
  mutate({ table: 'care_threads', action: 'update', payload: { status }, match: { id } });

export const deleteThread = (mutate: Mutate, id: string) =>
  mutate({ table: 'care_threads', action: 'delete', match: { id } });

export const deleteEntry = (mutate: Mutate, id: string) =>
  mutate({ table: 'care_entries', action: 'delete', match: { id } });

export interface NoteToSave {
  id: string;
  spaceId: string;
  recipientId: string;
  threadId: string;
  type: 'nota' | 'esame';
  date: string;
  title: string;
  text: string;
  readings?: Record<string, unknown>;
}

/** Nota o esame aggiunti a mano al filone. */
export const addEntry = (mutate: Mutate, n: NoteToSave) =>
  mutate({
    table: 'care_entries',
    action: 'upsert',
    payload: {
      id: n.id,
      space_id: n.spaceId,
      recipient_id: n.recipientId,
      thread_id: n.threadId,
      type: n.type,
      entry_date: n.date,
      title: n.title.trim(),
      text: n.text.trim() || null,
      readings: n.readings ?? {},
    },
  });

/**
 * Registra che questa persona ha visto o esportato un filone. È un registro, non un'azione dell'utente: se non
 * riesce (offline, permessi) non deve disturbare, quindi l'errore si ignora di proposito.
 */
export async function logCareAccess(
  target: { spaceId: string; recipientId: string; threadId?: string | null },
  action: 'view' | 'export',
): Promise<void> {
  await supabase.from('care_audit').insert({
    space_id: target.spaceId,
    recipient_id: target.recipientId,
    thread_id: target.threadId ?? null,
    action,
  });
}
