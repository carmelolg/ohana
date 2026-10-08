import { formatEuro, parseMoneyInput, sharesDifference, splitEqual } from '@ohana/shared';

export type SplitMode = 'uguali' | 'personalizzate';
export interface Share {
  userId: string;
  amount: number;
}

/** Quote per ogni partecipante: in parti uguali oppure quelle scritte a mano (vuoto = 0). */
export function sharesFor(
  mode: SplitMode,
  total: number,
  participants: string[],
  custom: Record<string, string>,
): Share[] {
  return mode === 'uguali'
    ? splitEqual(total, participants)
    : participants.map((userId) => ({ userId, amount: parseMoneyInput(custom[userId] ?? '') ?? 0 }));
}

/** Messaggio per l'utente se la spesa non si può salvare, altrimenti null. */
export function expenseProblem(
  desc: string,
  total: number,
  participants: string[],
  shares: Share[],
): string | null {
  if (!desc.trim() || total <= 0) {
    return 'Inserisci descrizione e importo';
  }
  if (participants.length === 0) {
    return 'Scegli almeno una persona';
  }
  const gap = sharesDifference(shares, total);
  return gap === 0 ? null : `Le quote sommano ${formatEuro(total + gap)} invece di ${formatEuro(total)}`;
}
