import { newId } from '../outbox';
import { safeName } from '../files';
import { supabase } from '../supabase';
import { trackBusy } from '../busy';

// Allegati sanitari: bucket privato `care`, percorso `<spazio>/<persona>/…`, sempre con URL firmati a breve scadenza.

const SIGNED_URL_SECONDS = 60;

export interface CareUpload {
  spaceId: string;
  recipientId: string;
  entryId: string | null;
  file: File;
}

/** Carica il file e ne registra la riga. Richiede la rete: lancia un errore comprensibile se manca. */
export async function uploadCareFile({ spaceId, recipientId, entryId, file }: CareUpload): Promise<string> {
  const path = `${spaceId}/${recipientId}/${Date.now()}-${safeName(file.name)}`;
  const up = await trackBusy(async () =>
    supabase.storage.from('care').upload(path, file, { contentType: file.type || undefined }),
  );
  if (up.error) {
    throw new Error('Non riesco a caricare il file: serve la connessione');
  }
  const { error } = await trackBusy(async () =>
    supabase.from('care_files').insert({
      id: newId(),
      space_id: spaceId,
      recipient_id: recipientId,
      entry_id: entryId,
      name: file.name,
      path,
    }),
  );
  if (error) {
    throw new Error('Il file è stato caricato ma non registrato');
  }
  return path;
}

/** Carica la foto della persona assistita e restituisce il percorso da salvare sulla scheda. */
export async function uploadRecipientPhoto(
  spaceId: string,
  recipientId: string,
  file: File,
): Promise<string> {
  const path = `${spaceId}/${recipientId}/foto-${Date.now()}-${safeName(file.name)}`;
  const up = await trackBusy(async () =>
    supabase.storage.from('care').upload(path, file, { contentType: file.type || undefined }),
  );
  if (up.error) {
    throw new Error('Non riesco a caricare la foto: serve la connessione');
  }
  return path;
}

/** URL temporaneo del file, o `null` se non si riesce a firmarlo. */
export async function careFileUrl(path: string): Promise<string | null> {
  const { data } = await trackBusy(async () =>
    supabase.storage.from('care').createSignedUrl(path, SIGNED_URL_SECONDS),
  );
  return data?.signedUrl ?? null;
}

export async function openCareFile(path: string): Promise<boolean> {
  const url = await careFileUrl(path);
  if (!url) {
    return false;
  }
  window.open(url, '_blank', 'noopener');
  return true;
}

export async function removeCareFile(id: string, path: string): Promise<void> {
  await trackBusy(async () => supabase.storage.from('care').remove([path]));
  await trackBusy(async () => supabase.from('care_files').delete().eq('id', id));
}

/** Toglie i referti dal bucket privato: se fallisce non si cancella il tassello, che li tiene agganciati. */
export async function removeStoredCareFiles(paths: string[]): Promise<void> {
  if (paths.length === 0) {
    return;
  }
  const { error } = await trackBusy(async () => supabase.storage.from('care').remove(paths));
  if (error) {
    throw new Error('Non riesco a eliminare i referti: serve la connessione');
  }
}
