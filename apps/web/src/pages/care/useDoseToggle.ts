import { isoDayRome, type DoseItem } from '@ohana/shared';
import { markDoseTaken, unmarkDose } from '../../lib/api/medications';
import { useAuth } from '../../lib/auth';
import { useMutate } from '../../lib/data';
import { useToast } from '../../lib/toast';
import type { Medication } from '../../lib/types';

/** Segna o toglie una dose di oggi; la scorta si aggiorna da sola (lo fa il database). */
export function useDoseToggle() {
  const mutate = useMutate();
  const toast = useToast();
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  return async (item: DoseItem<Medication>) => {
    const target = {
      spaceId: item.med.space_id,
      medicationId: item.med.id,
      day: isoDayRome(item.at),
      slot: item.slot,
    };
    try {
      await (item.taken ? unmarkDose(mutate, target) : markDoseTaken(mutate, { ...target, userId }));
    } catch {
      // l'errore tecnico non aiuta chi sta dando le medicine: basta dire cosa fare
      toast('Non riesco a segnare la dose. Riprova.');
    }
  };
}
