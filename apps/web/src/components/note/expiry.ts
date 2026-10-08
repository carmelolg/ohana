import { addDaysRome, parseNoteExpiry, romeParts, romeToDate, startOfDayRome } from '@ohana/shared';

export type ExpiryChoice = 'none' | 'today' | 'tomorrow' | 'week' | 'month' | 'auto';

const endOfDay = (d: Date) => {
  const p = romeParts(d);
  return romeToDate(p.y, p.m, p.d, 23, 59);
};
const endOfDayIn = (days: number, now: Date) => endOfDay(addDaysRome(startOfDayRome(now), days));

/** Scadenze proposte per una nota; «auto» è quella capita dal testo («fino a domenica») e si aggiunge se c'è. */
export const EXPIRY_OPTIONS: { value: Exclude<ExpiryChoice, 'auto'>; label: string }[] = [
  { value: 'none', label: 'Non scade' },
  { value: 'today', label: 'Fino a stasera' },
  { value: 'tomorrow', label: 'Fino a domani' },
  { value: 'week', label: 'Per 7 giorni' },
  { value: 'month', label: 'Per 30 giorni' },
];

/** Quando scade la nota con la scelta fatta (o `null` se non scade). */
export function expiryDate(choice: ExpiryChoice, text: string, now: Date): Date | null {
  switch (choice) {
    case 'today':
      return endOfDay(now);
    case 'tomorrow':
      return endOfDayIn(1, now);
    case 'week':
      return endOfDayIn(7, now);
    case 'month':
      return endOfDayIn(30, now);
    case 'auto':
      return parseNoteExpiry(text, now);
    default:
      return null;
  }
}
