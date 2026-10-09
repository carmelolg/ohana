import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteThread, saveThread, setThreadStatus } from '../../lib/api/care';
import { useMutate } from '../../lib/data';
import { useDialog } from '../../lib/dialog';
import { showFormError } from '../../lib/formError';
import { newId } from '../../lib/outbox';
import type { CareRecipient, CareThread } from '../../lib/types';
import { buildThread, initialThreadForm, threadFormError, type ThreadForm } from './threadForm';

/** Stato e azioni del modulo di un filone (nuovo o esistente). */
export function useThreadForm(recipient: CareRecipient, existing: CareThread | null, usedHues: number[]) {
  const nav = useNavigate();
  const mutate = useMutate();
  const dialog = useDialog();
  const [form, setForm] = useState<ThreadForm>(() => initialThreadForm(existing, usedHues));
  const [error, setError] = useState('');
  const showError = (message: string) => showFormError(setError, message);
  const [busy, setBusy] = useState(false);
  const id = useRef(existing?.id ?? newId()).current;
  const patch = (p: Partial<ThreadForm>) => setForm((f) => ({ ...f, ...p }));
  const home = `/cura/${recipient.id}`;

  async function save() {
    const problem = threadFormError(form);
    if (problem) {
      return showError(problem);
    }
    setBusy(true);
    try {
      await saveThread(
        mutate,
        buildThread(form, { id, spaceId: recipient.space_id, recipientId: recipient.id }),
      );
      nav(`${home}/filone/${id}`, { replace: true });
    } catch {
      showError('Non riesco a salvare il filone. Riprova.');
      setBusy(false);
    }
  }

  async function remove() {
    const ok = await dialog.confirm({
      title: `Eliminare «${form.title}»?`,
      message: 'Spariscono tutti i tasselli del filone. Per tenerli, chiudi il filone.',
      confirmLabel: 'Elimina',
      danger: true,
    });
    if (ok) {
      await deleteThread(mutate, id);
      nav(home, { replace: true });
    }
  }

  async function toggleStatus() {
    await setThreadStatus(mutate, id, existing?.status === 'attivo' ? 'chiuso' : 'attivo');
    nav(home, { replace: true });
  }

  return { id, form, patch, error, busy, save, remove, toggleStatus };
}
