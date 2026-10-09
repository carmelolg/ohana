import { isoDayRome } from '../dates';
import { slotInstant } from './stock';

export interface DoseMed {
  id: string;
  name: string;
  strength: string | null;
  dose_units: number;
  unit: string;
  schedule: string[];
  active: boolean;
}

export interface TakenDose {
  medication_id: string;
  day: string;
  slot: string;
}

export interface DoseItem<M extends DoseMed> {
  med: M;
  slot: string;
  at: Date;
  taken: boolean;
}

/** Orario senza zero iniziale: «08:00» → «8:00». */
export const formatSlot = (slot: string): string => slot.replace(/^0/, '');

/** «ore 8:00», «ore 8:00 e 20:00», «ore 8:00, 13:00 e 20:00»; senza orari: «al bisogno». */
export function scheduleLabel(schedule: string[]): string {
  const slots = schedule.map(formatSlot);
  if (slots.length === 0) {
    return 'al bisogno';
  }
  if (slots.length === 1) {
    return `ore ${slots[0]}`;
  }
  return `ore ${slots.slice(0, -1).join(', ')} e ${slots[slots.length - 1]}`;
}

/** «1 cpr», «2 cpr», «1,5 cpr». */
export const doseLabel = (med: Pick<DoseMed, 'dose_units' | 'unit'>): string =>
  `${String(med.dose_units).replace('.', ',')} ${med.unit}`;

/** Le dosi previste in un giorno, in ordine di orario, ciascuna con lo stato «presa». */
export function dosesOfDay<M extends DoseMed>(meds: M[], taken: TakenDose[], day: Date): DoseItem<M>[] {
  const iso = isoDayRome(day);
  const done = new Set(taken.filter((t) => t.day === iso).map((t) => `${t.medication_id}|${t.slot}`));
  return meds
    .filter((m) => m.active)
    .flatMap((med) =>
      med.schedule.map((slot) => ({
        med,
        slot,
        at: slotInstant(iso, slot),
        taken: done.has(`${med.id}|${slot}`),
      })),
    )
    .sort((a, b) => a.at.getTime() - b.at.getTime() || a.med.name.localeCompare(b.med.name, 'it'));
}

/** La prossima dose da dare: la prima non presa da adesso in poi; se sono tutte passate, la più vecchia rimasta indietro. */
export function nextDose<M extends DoseMed>(items: DoseItem<M>[], now: Date): DoseItem<M> | null {
  const pending = items.filter((i) => !i.taken);
  return pending.find((i) => i.at >= now) ?? pending[0] ?? null;
}

export function doseSummary<M extends DoseMed>(items: DoseItem<M>[], now: Date) {
  return { taken: items.filter((i) => i.taken).length, total: items.length, next: nextDose(items, now) };
}
