import { addDaysRome, isoDayRome, startOfDayRome } from '@ohana/shared';
import {
  useCareRecipients,
  useCareThreads,
  useDoses,
  useMedications,
  useScopedRecipients,
  useSpace,
} from '../../lib/data';
import type { CareRecipient, CareThread, Medication, MedicationDose } from '../../lib/types';

/** Finestra delle dosi lette: basta per stimare le scorte e mostrare «oggi». */
const DOSE_WINDOW_DAYS = 60;

export interface RecipientData {
  recipient: CareRecipient | null;
  /** Persone della vista corrente (per il cambio persona). */
  scope: CareRecipient[];
  threads: CareThread[];
  meds: Medication[];
  doses: MedicationDose[];
  canWrite: boolean;
  loading: boolean;
}

/**
 * Tutto ciò che serve a una schermata di Cura per una persona: la scheda, i suoi filoni, le terapie e le dosi recenti.
 * Senza id sceglie la prima persona della vista.
 */
export function useRecipientData(recipientId: string | undefined): RecipientData {
  const { canWrite } = useSpace();
  const scope = useScopedRecipients();
  const { data: all = [], isLoading } = useCareRecipients();
  const { data: threads = [] } = useCareThreads();
  const { data: meds = [] } = useMedications();
  const since = isoDayRome(addDaysRome(startOfDayRome(new Date()), -DOSE_WINDOW_DAYS));
  const { data: doses = [] } = useDoses(since);
  const recipient = (recipientId ? all.find((r) => r.id === recipientId) : scope[0]) ?? null;
  return {
    recipient,
    scope,
    threads: threads.filter((t) => t.recipient_id === recipient?.id),
    meds: meds.filter((m) => m.recipient_id === recipient?.id),
    doses,
    canWrite: !!recipient && canWrite(recipient.space_id),
    loading: isLoading,
  };
}
