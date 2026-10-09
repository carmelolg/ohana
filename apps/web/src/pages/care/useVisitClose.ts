import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { normalizeText, suggestThread } from '@ohana/shared';
import { categoryIdOf } from '../../lib/api/careEvents';
import { saveThread } from '../../lib/api/care';
import { saveVisitOutcome } from '../../lib/api/careVisit';
import { uploadCareFile } from '../../lib/api/careFiles';
import {
  useCareRecipients,
  useCareThreads,
  useCategories,
  useEvent,
  useMedications,
  useMutate,
} from '../../lib/data';
import { showFormError } from '../../lib/formError';
import { newId } from '../../lib/outbox';
import { useToast } from '../../lib/toast';
import type { CareThread, EventRow } from '../../lib/types';
import { nextHue } from './threadForm';
import { buildVisitOutcome, initialVisitCloseForm, visitCloseError, type VisitCloseForm } from './visitClose';

/** Carica i referti uno per uno: quelli che non partono (offline) si elencano senza annullare il tassello già salvato. */
async function uploadReports(
  spaceId: string,
  recipientId: string,
  entryId: string,
  files: File[],
): Promise<string[]> {
  const failed: string[] = [];
  for (const file of files) {
    try {
      await uploadCareFile({ spaceId, recipientId, entryId, file });
    } catch {
      failed.push(file.name);
    }
  }
  return failed;
}

/** Persone, filoni e terapie tra cui scegliere per una visita: quelli dello spazio dell'impegno, con il filone già proposto. */
function useVisitScope(visit: EventRow | null | undefined, recipientId: string) {
  const { data: recipients = [] } = useCareRecipients();
  const { data: allThreads = [] } = useCareThreads();
  const { data: allMeds = [] } = useMedications();
  const people = recipients.filter((r) => r.space_id === visit?.space_id);
  const suggested = useMemo(() => {
    if (!visit) {
      return null;
    }
    const active = allThreads.filter(
      (t) => people.some((p) => p.id === t.recipient_id) && t.status === 'attivo',
    );
    return suggestThread(active, visit, visit.contacts?.name ?? null, normalizeText);
    // `people` deriva da recipients e visit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visit, allThreads, recipients]);
  const currentRecipient = people.find((p) => p.id === (recipientId || suggested?.recipient_id)) ?? people[0];
  const threads = allThreads.filter((t) => t.recipient_id === currentRecipient?.id && t.status === 'attivo');
  const meds = allMeds.filter((m) => m.recipient_id === currentRecipient?.id && m.active);
  return { people, suggested, currentRecipient, threads, meds };
}

/** Stato e salvataggio della chiusura di una visita (4c). */
export function useVisitClose(eventId: string | undefined) {
  const mutate = useMutate();
  const toast = useToast();
  const nav = useNavigate();
  const { data: visit, isLoading } = useEvent(eventId);
  const { data: categories = [] } = useCategories();
  const entryId = useMemo(() => newId(), []);
  const [form, setForm] = useState<VisitCloseForm | null>(null);
  const [recipientId, setRecipientId] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState('');
  const showError = (message: string) => showFormError(setError, message);
  const [busy, setBusy] = useState(false);
  const { people, suggested, currentRecipient, threads, meds } = useVisitScope(visit, recipientId);

  const state: VisitCloseForm =
    form ??
    initialVisitCloseForm(
      suggested && suggested.recipient_id === currentRecipient?.id ? suggested.id : (threads[0]?.id ?? ''),
    );
  const thread = threads.find((t) => t.id === state.threadId);
  const patch = (p: Partial<VisitCloseForm>) => setForm({ ...state, ...p });

  async function createThread(title: string) {
    if (!currentRecipient || !title.trim()) {
      return;
    }
    const id = newId();
    await saveThread(mutate, {
      id,
      spaceId: currentRecipient.space_id,
      recipientId: currentRecipient.id,
      title,
      specialty: '',
      doctor: visit?.contacts?.name ?? '',
      contactId: visit?.contact_id ?? null,
      colorHue: nextHue(threads.map((t) => t.color_hue)),
      startedAt: null,
      trackedParams: [],
    });
    patch({ threadId: id });
  }

  async function save() {
    const known = threads.find((t) => t.id === state.threadId) as CareThread | undefined;
    const problem = visitCloseError(state, meds);
    if (problem || !visit || !known) {
      return showError(problem ?? 'Scegli il filone');
    }
    setBusy(true);
    try {
      await saveVisitOutcome(
        mutate,
        buildVisitOutcome(state, {
          entryId,
          visit,
          thread: known,
          meds,
          scadenzaCategoryId: categoryIdOf(categories, visit.space_id, 'scadenza'),
        }),
      );
      const failed = await uploadReports(visit.space_id, known.recipient_id, entryId, files);
      toast(failed.length ? `Salvato. Non ho caricato: ${failed.join(', ')}` : 'Visita aggiunta al filone');
      nav(`/cura/${known.recipient_id}/filone/${known.id}`, { replace: true });
    } catch {
      showError('Non riesco a salvare. Riprova.');
      setBusy(false);
    }
  }

  return {
    visit,
    isLoading,
    people,
    currentRecipient,
    setRecipientId: (id: string) => {
      setRecipientId(id);
      setForm(null);
    },
    threads,
    thread,
    meds,
    state,
    patch,
    createThread,
    files,
    setFiles,
    error,
    busy,
    save,
  };
}
