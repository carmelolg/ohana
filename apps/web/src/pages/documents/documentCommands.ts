import { newId } from '../../lib/outbox';
import { removeAttachment, uploadAttachment } from '../../lib/files';
import type { Mutate } from '../../lib/data';
import type { DocumentRow } from '../../lib/types';

/** Elimina il documento (subito dalla lista) e poi il suo file. */
export async function deleteDocument(mutate: Mutate, d: DocumentRow): Promise<void> {
  await mutate({ table: 'documents', action: 'delete', match: { id: d.id } }, [
    {
      key: ['documents'],
      patch: (old: unknown) => ((old as DocumentRow[]) ?? []).filter((x) => x.id !== d.id),
    },
  ]);
  if (d.attachment_id) {
    await removeAttachment(d.attachment_id, d.attachments?.path);
  }
}

/** Cambia il nome mostrato del documento (il file resta com'è). */
export async function renameDocument(mutate: Mutate, d: DocumentRow, title: string): Promise<void> {
  await mutate({ table: 'documents', action: 'update', payload: { title }, match: { id: d.id } }, [
    {
      key: ['documents'],
      patch: (old: unknown) =>
        ((old as DocumentRow[]) ?? []).map((x) => (x.id === d.id ? { ...x, title } : x)),
    },
  ]);
}

export interface UploadInput {
  file: File;
  spaceId: string;
  title: string;
  folder: string;
  /** Data `aaaa-mm-gg`, vuota se il documento non scade. */
  expires: string;
  userId: string;
}

/** Carica il file nello spazio e registra il documento nella cartella scelta. */
export async function uploadDocument(mutate: Mutate, input: UploadInput): Promise<void> {
  const { file, spaceId, folder } = input;
  const up = await uploadAttachment(spaceId, file, file.name, { folder: `documenti/${folder}` });
  await mutate({
    table: 'documents',
    action: 'upsert',
    payload: {
      id: newId(),
      space_id: spaceId,
      title: input.title.trim() || file.name,
      folder,
      attachment_id: up.id,
      doc_type: null,
      expires_at: input.expires || null,
      created_by: input.userId,
    },
  });
}
