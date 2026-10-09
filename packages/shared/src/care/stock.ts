import { addDaysRome, isoDayRome, romeToDate, startOfDayRome } from '../dates';

/** Una dose prevista o segnata: giorno `YYYY-MM-DD` e orario `HH:MM` (ora di Roma). */
export interface DoseKey {
  day: string;
  slot: string;
}

export interface StockMed {
  stock_units: number;
  /** Istante a cui vale `stock_units`: da lì le dosi non segnate si stimano dalla posologia. */
  stock_as_of: string;
  dose_units: number;
  schedule: string[];
}

/** Sotto questa soglia (in giorni) la scorta è «in esaurimento». */
export const LOW_STOCK_DAYS = 7;
const MAX_SCAN_DAYS = 400;

/** Istante di una dose: l'orario «a muro» di Roma di quel giorno. */
export function slotInstant(day: string, slot: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  const [h, min] = slot.split(':').map(Number);
  return romeToDate(y, m, d, h, min);
}

export const unitsPerDay = (med: Pick<StockMed, 'dose_units' | 'schedule'>): number =>
  med.dose_units * med.schedule.length;

/** Dosi previste con orario nell'intervallo (da, a]. */
export function scheduledSlotsBetween(schedule: string[], from: Date, to: Date): DoseKey[] {
  if (schedule.length === 0 || to <= from) {
    return [];
  }
  const out: DoseKey[] = [];
  const first = startOfDayRome(from);
  for (let i = 0; i <= MAX_SCAN_DAYS; i++) {
    const dayDate = addDaysRome(first, i);
    if (dayDate > to) {
      break;
    }
    const day = isoDayRome(dayDate);
    for (const slot of schedule) {
      const at = slotInstant(day, slot);
      if (at > from && at <= to) {
        out.push({ day, slot });
      }
    }
  }
  return out;
}

/**
 * Scorta stimata adesso: `stock_units` scende già a ogni dose segnata (lo fa il database), quindi si tolgono solo le dosi
 * previste dopo `stock_as_of` che nessuno ha segnato.
 */
export function estimateStock(med: StockMed, taken: DoseKey[], now: Date): number {
  const logged = new Set(taken.map((d) => `${d.day}|${d.slot}`));
  const unlogged = scheduledSlotsBetween(med.schedule, new Date(med.stock_as_of), now).filter(
    (s) => !logged.has(`${s.day}|${s.slot}`),
  );
  return Math.max(med.stock_units - unlogged.length * med.dose_units, 0);
}

/** Giorni di scorta rimasti; `null` se la terapia non ha orari (al bisogno). */
export function stockDaysLeft(med: StockMed, taken: DoseKey[], now: Date): number | null {
  const perDay = unitsPerDay(med);
  return perDay > 0 ? Math.floor(estimateStock(med, taken, now) / perDay) : null;
}

export type StockLevel = 'ok' | 'low' | 'empty';

export function stockLevel(daysLeft: number | null): StockLevel {
  if (daysLeft === null || daysLeft >= LOW_STOCK_DAYS) {
    return 'ok';
  }
  return daysLeft <= 0 ? 'empty' : 'low';
}

/** «finisce tra 6 giorni», «finisce domani», «finita». */
export function stockLabel(daysLeft: number | null): string {
  if (daysLeft === null || daysLeft >= LOW_STOCK_DAYS) {
    return 'scorta ok';
  }
  if (daysLeft <= 0) {
    return 'finita';
  }
  return daysLeft === 1 ? 'finisce domani' : `finisce tra ${daysLeft} giorni`;
}

/** Quanto è piena la barra della scorta, da 0 a 1 (rispetto alla confezione, o a 30 giorni se non è nota). */
export function stockFraction(estimate: number, med: { package_units: number | null } & StockMed): number {
  const full = med.package_units ?? unitsPerDay(med) * 30;
  return full > 0 ? Math.min(Math.max(estimate / full, 0), 1) : 0;
}
