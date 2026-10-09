import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteRecipient, saveRecipient, setRecipientPhoto } from '../../lib/api/care';
import { uploadRecipientPhoto } from '../../lib/api/careFiles';
import { useAuth } from '../../lib/auth';
import { useMutate, useSpace } from '../../lib/data';
import { useDialog } from '../../lib/dialog';
import { showFormError } from '../../lib/formError';
import { newId } from '../../lib/outbox';
import type { CareRecipient } from '../../lib/types';
import {
  buildRecipient,
  initialRecipientForm,
  linkMember,
  recipientFormError,
  type RecipientForm,
} from './recipientForm';

/** Stato e azioni del modulo della persona assistita (nuova o esistente). */
export function useRecipientForm(existing: CareRecipient | null) {
  const nav = useNavigate();
  const mutate = useMutate();
  const dialog = useDialog();
  const { session } = useAuth();
  const me = session?.user.id ?? '';
  const { spaces, canWrite, selected } = useSpace();
  const writableSpaces = spaces.filter((s) => canWrite(s.id));
  const [form, setForm] = useState<RecipientForm>(() =>
    initialRecipientForm(existing, {
      spaceId: (selected !== 'all' && canWrite(selected) ? selected : writableSpaces[0]?.id) ?? '',
      me,
    }),
  );
  const [photo, setPhoto] = useState<File | null>(null);
  const [error, setError] = useState('');
  const showError = (message: string) => showFormError(setError, message);
  const [busy, setBusy] = useState(false);
  const id = useRef(existing?.id ?? newId()).current;
  const patch = (p: Partial<RecipientForm>) => setForm((f) => ({ ...f, ...p }));

  const linkTo = (userId: string) =>
    setForm((f) =>
      linkMember(
        f,
        spaces.find((s) => s.id === f.spaceId)?.space_members.find((m) => m.user_id === userId) ?? null,
      ),
    );

  async function save() {
    const problem = recipientFormError(form);
    if (problem) {
      return showError(problem);
    }
    setBusy(true);
    try {
      await saveRecipient(mutate, buildRecipient(form, id));
      if (photo) {
        await setRecipientPhoto(mutate, id, await uploadRecipientPhoto(form.spaceId, id, photo));
      }
      nav(`/cura/${id}`, { replace: true });
    } catch {
      // se la scheda è già stata salvata (offline la coda la manda dopo) l'errore riguarda solo la foto
      showError(
        photo
          ? 'Scheda salvata, ma non riesco a caricare la foto. Riprova dalla scheda.'
          : 'Non riesco a salvare. Riprova.',
      );
      setBusy(false);
    }
  }

  async function remove() {
    const ok = await dialog.confirm({
      title: 'Eliminare la persona assistita?',
      message: 'Spariscono filoni, tasselli, terapie e parametri. Non si può annullare.',
      confirmLabel: 'Elimina',
      danger: true,
    });
    if (ok) {
      await deleteRecipient(mutate, id);
      nav('/altro', { replace: true });
    }
  }

  return {
    id,
    me,
    form,
    patch,
    linkMember: linkTo,
    photo,
    setPhoto,
    error,
    busy,
    save,
    remove,
    writableSpaces,
  };
}
