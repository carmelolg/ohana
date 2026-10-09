import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { categoryIdOf } from '../../lib/api/careEvents';
import {
  deleteMedication,
  saveMedication,
  setMedicationActive,
  syncPlanReminder,
} from '../../lib/api/medications';
import { useCareEvents, useCategories, useMutate } from '../../lib/data';
import { showFormError } from '../../lib/formError';
import { newId } from '../../lib/outbox';
import { useToast } from '../../lib/toast';
import type { CareRecipient, Medication, MedicationDose } from '../../lib/types';
import { buildMedication, initialMedForm, medFormError, type MedForm } from './medicationForm';

const PLAN_TITLE = 'Piano terapeutico';

/** Stato e salvataggio del modulo di un farmaco (nuovo o esistente). */
export function useMedicationForm(
  recipient: CareRecipient,
  existing: Medication | null,
  doses: MedicationDose[],
) {
  const mutate = useMutate();
  const toast = useToast();
  const nav = useNavigate();
  const { data: events = [] } = useCareEvents();
  const { data: categories = [] } = useCategories();
  const now = useMemo(() => new Date(), []);
  const initial = useMemo(
    () =>
      initialMedForm(
        existing,
        doses.filter((d) => d.medication_id === existing?.id),
        now,
      ),
    // il modulo parte una volta sola: le dosi che arrivano dopo non devono sovrascrivere ciò che si sta scrivendo
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [form, setForm] = useState<MedForm>(initial);
  const [error, setError] = useState('');
  const showError = (message: string) => showFormError(setError, message);
  const [busy, setBusy] = useState(false);
  const id = useMemo(() => existing?.id ?? newId(), [existing?.id]);
  const back = () => nav(`/cura/${recipient.id}/terapie`, { replace: true });

  async function save() {
    const problem = medFormError(form);
    if (problem) {
      return showError(problem);
    }
    setBusy(true);
    try {
      const toSave = buildMedication(form, {
        id,
        spaceId: recipient.space_id,
        recipientId: recipient.id,
        existing,
        initial,
        now,
      });
      await saveMedication(mutate, toSave);
      const plan = events.find(
        (e) => e.medication_id === id && e.status === 'open' && e.title.startsWith(PLAN_TITLE),
      );
      await syncPlanReminder(mutate, {
        med: { id, name: toSave.name.trim(), space_id: recipient.space_id },
        planDate: form.planDate,
        existingEventId: plan?.id ?? null,
        assigneeId: recipient.duty_user_id ?? recipient.caregiver_ids[0] ?? null,
        categoryId: categoryIdOf(categories, recipient.space_id, 'scadenza'),
      });
      back();
    } catch {
      showError('Non riesco a salvare il farmaco. Riprova.');
      setBusy(false);
    }
  }

  async function toggleActive() {
    if (existing) {
      await setMedicationActive(mutate, existing.id, !existing.active);
      toast(existing.active ? 'Terapia sospesa' : 'Terapia riattivata');
      back();
    }
  }

  async function remove() {
    if (existing) {
      await deleteMedication(mutate, existing.id);
      back();
    }
  }

  return {
    form,
    setForm,
    error,
    busy,
    save,
    toggleActive,
    remove,
    patch: (p: Partial<MedForm>) => setForm((f) => ({ ...f, ...p })),
  };
}
