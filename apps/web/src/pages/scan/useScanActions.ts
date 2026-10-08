import { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { useCategories, useMutate, useSpace } from '../../lib/data';
import { useBack } from '../../lib/nav';
import { useToast } from '../../lib/toast';
import { llmParse } from '../../lib/workerApi';
import { saveScannedDocument } from './saveScannedDocument';
import type { ScanForm } from './useScanForm';
import type { useScanReader } from './useScanReader';

/** Salvataggio del documento scansionato e miglioramento dei campi con l'AI (solo il testo letto). */
export function useScanActions(form: ScanForm, reader: ReturnType<typeof useScanReader>) {
  const { session } = useAuth();
  const { spaces, canWrite } = useSpace();
  const { data: categories = [] } = useCategories();
  const mutate = useMutate();
  const toast = useToast();
  const back = useBack('/oggi');
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState('');

  const space = spaces.find((s) => s.id === form.spaceId);
  const memberIds = (space?.space_members ?? []).map((m) => m.user_id);
  const canSave = !!form.spaceId && canWrite(form.spaceId) && !!reader.file && !busy;

  async function improveWithAi() {
    setBusy(true);
    try {
      form.applyLlm(await llmParse(reader.text));
      toast('Campi migliorati: controllali prima di salvare');
    } catch (e) {
      toast((e as Error).message);
    }
    setBusy(false);
  }

  async function save() {
    if (!canSave || !reader.file) {
      return;
    }
    setBusy(true);
    setSaveError('');
    try {
      const createdDeadline = await saveScannedDocument(mutate, {
        file: reader.file,
        userId: session!.user.id,
        spaceId: form.spaceId,
        memberIds,
        deadlineCategoryId: categories.find((c) => c.space_id === form.spaceId && c.slug === 'scadenza')?.id,
        title: form.title,
        docType: form.docType,
        label: form.label,
        supplier: form.supplier,
        amount: form.amountValue,
        due: form.due,
        dueDate: form.dueDate,
        folder: form.folder,
        text: reader.text,
        createDue: form.createDue,
        daysBefore: form.daysBefore,
        attach: form.attach,
        split: form.split,
      });
      toast(createdDeadline ? 'Salvato: scadenza creata' : 'Documento salvato');
      back();
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return { space, memberIds, canSave, busy, saveError, save, improveWithAi, back };
}
