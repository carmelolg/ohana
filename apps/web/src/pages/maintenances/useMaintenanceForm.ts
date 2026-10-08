import { useEffect, useMemo, useState } from 'react';
import { nextDue, useMutate } from '../../lib/data';
import { fromDateInput, toDateInput } from '../../lib/date-input';
import { useDialog } from '../../lib/dialog';
import { useToast } from '../../lib/toast';
import type { Maintenance } from '../../lib/types';
import type { Values } from './MaintenanceFields';
import { computeNext, initialRule, initialTitle, templateOf, type FormState } from './formState';
import { deleteMaintenance, saveMaintenance, useScheduler } from './maintenanceCommands';

interface Args {
  state: FormState;
  /** Spazio da proporre per una nuova manutenzione. */
  defaultSpaceId: string;
  onClose: () => void;
}

/** Controlla i dati mancanti prima di salvare; restituisce il messaggio d'errore, o null se si può salvare. */
export function validateForm(values: Values, dueDate: Date | null): string | null {
  if (!values.title.trim()) {
    return 'Dai un nome alla manutenzione';
  }
  if (!values.spaceId) {
    return 'Scegli uno spazio';
  }
  return dueDate ? null : 'Scegli la prossima scadenza';
}

/** Stato e azioni del modulo manutenzione: finché la scadenza non è scelta a mano segue la regola. */
export function useMaintenanceForm({ state, defaultSpaceId, onClose }: Args) {
  const mutate = useMutate();
  const schedule = useScheduler();
  const dialog = useDialog();
  const toast = useToast();
  const now = useMemo(() => new Date(), []);
  const editing: Maintenance | null = state.mode === 'edit' ? state.m : null;
  const template = templateOf(state);
  const currentDue = editing ? nextDue(editing) : null;

  const [values, setValues] = useState<Values>({
    spaceId: editing?.space_id ?? defaultSpaceId,
    title: initialTitle(state, template),
    rrule: initialRule(state, template),
    contactId: editing?.contact_id ?? '',
    lastDone: editing?.last_done_at ?? '',
    cost: editing?.last_cost != null ? String(editing.last_cost) : '',
    next: toDateInput(
      currentDue ?? computeNext(initialRule(state, template), editing?.last_done_at ?? '', now),
    ),
  });
  const [nextTouched, setNextTouched] = useState(false);
  const [error, setError] = useState('');
  const computedNext = useMemo(
    () => computeNext(values.rrule, values.lastDone, now),
    [values.rrule, values.lastDone, now],
  );

  useEffect(() => {
    if (!nextTouched && !currentDue) {
      setValues((v) => ({ ...v, next: toDateInput(computedNext) }));
    }
  }, [computedNext, nextTouched, currentDue]);

  const change = (patch: Partial<Values>) => {
    if (patch.next !== undefined) {
      setNextTouched(true);
    }
    setValues((v) => ({ ...v, ...patch }));
  };

  async function save() {
    const dueDate = fromDateInput(values.next);
    const problem = validateForm(values, dueDate);
    if (problem || !dueDate) {
      return setError(problem ?? '');
    }
    try {
      await saveMaintenance(mutate, schedule, {
        editing,
        spaceId: values.spaceId,
        title: values.title.trim(),
        rrule: values.rrule,
        contactId: values.contactId,
        lastDone: values.lastDone,
        cost: values.cost,
        templateKey: template.key,
        dueDate,
      });
      toast(editing ? 'Manutenzione aggiornata' : 'Manutenzione aggiunta: la scadenza è nel calendario');
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function remove() {
    if (!editing) {
      return;
    }
    const confirmed = await dialog.confirm({
      title: `Eliminare «${editing.title}»?`,
      message: 'Sparisce anche la sua scadenza dal calendario.',
      confirmLabel: 'Elimina',
      danger: true,
    });
    if (confirmed) {
      await deleteMaintenance(mutate, editing.id);
      onClose();
    }
  }

  return { editing, template, values, change, error, save, remove };
}
