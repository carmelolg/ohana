import { useMutate } from '../../lib/data';
import { useDialog } from '../../lib/dialog';
import { useToast } from '../../lib/toast';
import type { Procedure, ProcedureDoc } from '../../lib/types';
import { deleteProcedureDoc, deleteProcedureFile } from './procedureCommands';

interface UploadedFile {
  name: string;
  attachmentId: string;
  docId: string | null;
  path: string | undefined;
}

/** Eliminazione di un documento della pratica: chiede conferma, poi cancella e avvisa (anche se non riesce). */
export function useDocRemoval(p: Procedure) {
  const mutate = useMutate();
  const dialog = useDialog();
  const toast = useToast();

  async function confirmRemove(name: string, remove: () => Promise<void>) {
    const confirmed = await dialog.confirm({
      title: `Eliminare «${name}»?`,
      message: 'Il documento viene eliminato per tutti i membri dello spazio.',
      confirmLabel: 'Elimina',
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    try {
      await remove();
      toast('Documento eliminato');
    } catch (e) {
      toast('Eliminazione non riuscita: ' + (e as Error).message);
    }
  }

  return {
    removeDoc: (d: ProcedureDoc) => confirmRemove(d.name, () => deleteProcedureDoc(mutate, p, d.id)),
    removeRow: (f: UploadedFile) => confirmRemove(f.name, () => deleteProcedureFile(mutate, p, f)),
  };
}
