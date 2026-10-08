import { supabase } from './supabase';
import { newId } from './outbox';

export const safeName = (n: string) => n.replace(/[^\w.-]+/g, '_');

/** Carica un file nello spazio (bucket privato `attachments`, cartella = id spazio) e ne registra l'allegato. Richiede la rete. */
export async function uploadAttachment(
  spaceId: string,
  file: Blob,
  name: string,
  opts: { eventId?: string; folder?: string } = {},
) {
  const path = `${spaceId}/${opts.folder ?? 'file'}/${Date.now()}-${safeName(name)}`;
  const up = await supabase.storage
    .from('attachments')
    .upload(path, file, { contentType: file.type || undefined });
  if (up.error) {
    throw new Error(up.error.message);
  }
  const id = newId();
  const { error } = await supabase
    .from('attachments')
    .insert({ id, space_id: spaceId, event_id: opts.eventId ?? null, path, name });
  if (error) {
    throw new Error(error.message);
  }
  return { id, path };
}

export async function openAttachment(path: string) {
  const { data } = await supabase.storage.from('attachments').createSignedUrl(path, 60);
  if (data) {
    window.open(data.signedUrl, '_blank', 'noopener');
  }
}

/** Elimina il file dallo storage e la sua riga di allegato. */
export async function removeAttachment(attachmentId: string, path: string | undefined): Promise<void> {
  if (path) {
    await supabase.storage.from('attachments').remove([path]);
  }
  await supabase.from('attachments').delete().eq('id', attachmentId);
}

/** Carica un file allegato a un impegno (`<spazio>/<impegno>/…`). Lancia se l'upload fallisce (es. offline). */
export async function uploadAttachmentToEvent(
  spaceId: string,
  eventId: string,
  file: File,
): Promise<{ path: string }> {
  const path = `${spaceId}/${eventId}/${Date.now()}-${safeName(file.name)}`;
  const { error } = await supabase.storage.from('attachments').upload(path, file);
  if (error) {
    throw new Error(error.message);
  }
  return { path };
}
