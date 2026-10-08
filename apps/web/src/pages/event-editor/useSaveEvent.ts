import { useState } from 'react';
import { useMutate } from '../../lib/data';
import { useBack } from '../../lib/nav';
import { useToast } from '../../lib/toast';
import type { Category } from '../../lib/types';
import { saveEvent, type EventToSave } from './saveEvent';
import { savedMessage, validateEvent } from './validation';

/** Tutto ciò che si salva, tranne la categoria (si risolve dopo aver atteso le operazioni in corso); `startsAt` può mancare finché non si valida. */
type DraftToSave = Omit<EventToSave, 'categoryId' | 'startsAt'> & { startsAt: Date | null };

interface Args {
  toSave: DraftToSave;
  categoriesOfSpace: Category[];
  /** Categoria scelta o suggerita. */
  categoryId: string;
  /** Attende creazioni/eliminazioni di categorie ancora in volo. */
  settleCategories: () => Promise<unknown>;
  recordFeedback: (finalCategory: Category | undefined, title: string) => void;
  /** Errore da mostrare (anche quelli arrivati da altri pezzi della schermata). */
  setError: (message: string) => void;
}

/** Caso d'uso «Salva»: valida, attende le categorie, scrive, impara dalla scelta e torna indietro. */
export function useSaveEvent({
  toSave,
  categoriesOfSpace,
  categoryId,
  settleCategories,
  recordFeedback,
  setError,
}: Args) {
  const mutate = useMutate();
  const toast = useToast();
  const back = useBack('/oggi');
  const [busy, setBusy] = useState(false);

  async function save() {
    const { startsAt } = toSave;
    const invalid = validateEvent(toSave);
    if (invalid || !startsAt) {
      return setError(invalid ?? 'Scegli quando');
    }
    setBusy(true);
    setError('');
    try {
      await settleCategories();
      // mai una categoria inesistente: se quella scelta non c'è più, «Altro»
      const finalCategory =
        categoriesOfSpace.find((c) => c.id === categoryId) ??
        categoriesOfSpace.find((c) => c.slug === 'altro');
      const { failedUploads } = await saveEvent(mutate, {
        ...toSave,
        startsAt,
        categoryId: finalCategory?.id ?? '',
      });
      if (failedUploads.length) {
        toast('Allegato non caricato (sei offline?): riprova dalla modifica');
      }
      if (!toSave.isChore) {
        recordFeedback(finalCategory, toSave.title);
      }
      toast(savedMessage(toSave.isChore, !!toSave.existing));
      back();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return { save, busy };
}
