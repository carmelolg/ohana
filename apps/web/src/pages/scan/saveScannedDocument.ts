import { splitEqual, type DocType } from '@ohana/shared';
import type { Mutate } from '../../lib/data';
import { uploadAttachment } from '../../lib/files';
import { newId } from '../../lib/outbox';

export interface ScannedDocument {
  file: File;
  userId: string;
  spaceId: string;
  /** Persone tra cui dividere la spesa. */
  memberIds: string[];
  /** Categoria «Scadenza» dello spazio, se esiste. */
  deadlineCategoryId: string | undefined;
  title: string;
  docType: DocType;
  label: string;
  supplier: string;
  amount: number | null;
  /** Scadenza come `YYYY-MM-DD` (stringa del campo) e come data. */
  due: string;
  dueDate: Date | null;
  folder: string;
  text: string;
  createDue: boolean;
  daysBefore: number;
  attach: boolean;
  split: boolean;
}

const MINUTES_PER_DAY = 1440;
const MAX_STORED_TEXT = 6000;

async function createDeadline(
  mutate: Mutate,
  d: ScannedDocument,
  dueDate: Date,
  attachmentId: string | null,
): Promise<string> {
  const eventId = newId();
  await mutate({
    table: 'events',
    action: 'upsert',
    payload: {
      id: eventId,
      space_id: d.spaceId,
      title: d.title,
      ...(d.deadlineCategoryId ? { category_id: d.deadlineCategoryId } : {}),
      starts_at: dueDate.toISOString(),
      amount: d.amount,
      created_by: d.userId,
    },
  });
  await mutate({
    table: 'event_reminders',
    action: 'upsert',
    payload: {
      id: newId(),
      event_id: eventId,
      offset_minutes: d.daysBefore * MINUTES_PER_DAY,
      channels: ['email', 'push'],
    },
  });
  if (attachmentId) {
    await mutate({
      table: 'attachments',
      action: 'update',
      payload: { event_id: eventId },
      match: { id: attachmentId },
    });
  }
  return eventId;
}

async function storeDocument(mutate: Mutate, d: ScannedDocument, attachmentId: string): Promise<void> {
  const extracted = {
    label: d.label,
    supplier: d.supplier || null,
    amount: d.amount,
    dueDate: d.due || null,
    text: d.text.slice(0, MAX_STORED_TEXT),
  };
  await mutate({
    table: 'documents',
    action: 'upsert',
    payload: {
      id: newId(),
      space_id: d.spaceId,
      title: d.title,
      folder: d.folder,
      attachment_id: attachmentId,
      doc_type: d.docType,
      extracted_json: extracted,
      expires_at: d.due || null,
      created_by: d.userId,
    },
  });
}

async function createSharedExpense(
  mutate: Mutate,
  d: ScannedDocument,
  amount: number,
  eventId: string | null,
): Promise<void> {
  const id = newId();
  await mutate({
    table: 'expenses',
    action: 'upsert',
    payload: {
      id,
      space_id: d.spaceId,
      payer_id: d.userId,
      amount,
      description: d.title,
      date: new Date().toISOString().slice(0, 10),
      event_id: eventId,
    },
  });
  const shares = splitEqual(amount, d.memberIds).map((s) => ({
    expense_id: id,
    user_id: s.userId,
    amount: s.amount,
  }));
  await mutate({
    table: 'expense_shares',
    action: 'upsert',
    payload: shares,
    onConflict: 'expense_id,user_id',
  });
}

/**
 * Salva il documento letto: file allegato, scadenza con promemoria, voce in Documenti e spesa da dividere, secondo le scelte fatte.
 * Restituisce `true` se è stata creata una scadenza.
 */
export async function saveScannedDocument(mutate: Mutate, d: ScannedDocument): Promise<boolean> {
  const attachmentId =
    d.attach || d.createDue
      ? (await uploadAttachment(d.spaceId, d.file, d.file.name, { folder: `documenti/${d.folder}` })).id
      : null;
  const eventId = d.createDue && d.dueDate ? await createDeadline(mutate, d, d.dueDate, attachmentId) : null;
  if (d.attach && attachmentId) {
    await storeDocument(mutate, d, attachmentId);
  }
  if (d.split && d.amount) {
    await createSharedExpense(mutate, d, d.amount, eventId);
  }
  return eventId !== null;
}
