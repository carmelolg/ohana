import { removeEntryWithFiles } from '../../lib/api/care';
import { useAuth } from '../../lib/auth';
import { useMutate, useSpace } from '../../lib/data';
import { useDialog } from '../../lib/dialog';
import type { TimelineAction } from '../../lib/timeline';
import { useToast } from '../../lib/toast';
import type { CareEntry } from '../../lib/types';

// stessa regola della RLS `care_entries_delete`: l'autore o un amministratore dello spazio
const MANAGER_ROLES = ['owner', 'admin'];

/** «Elimina» sulle righe del filone: solo per chi può farlo, con conferma e referti eliminati insieme al tassello. */
export function useEntryRemoval(canWrite: boolean) {
  const mutate = useMutate();
  const dialog = useDialog();
  const toast = useToast();
  const { session } = useAuth();
  const { myRole } = useSpace();
  const me = session?.user.id;

  const canRemove = (entry: CareEntry) =>
    canWrite && (entry.author_id === me || MANAGER_ROLES.includes(myRole(entry.space_id) ?? ''));

  async function remove(entry: CareEntry) {
    const ok = await dialog.confirm({
      title: `Eliminare «${entry.title}»?`,
      message:
        entry.care_files.length > 0
          ? 'Spariscono anche i referti allegati. Non si recuperano.'
          : 'Il tassello sparisce dal filone. Non si recupera.',
      confirmLabel: 'Elimina',
      danger: true,
    });
    if (!ok) {
      return;
    }
    try {
      await removeEntryWithFiles(mutate, entry);
      toast('Tassello eliminato');
    } catch (e) {
      toast((e as Error).message);
    }
  }

  const removeEntry = (entry: CareEntry): TimelineAction | undefined =>
    canRemove(entry)
      ? {
          label: 'Elimina',
          ariaLabel: `Elimina il tassello ${entry.title}`,
          onClick: () => void remove(entry),
        }
      : undefined;

  return { removeEntry: canWrite ? removeEntry : undefined };
}
