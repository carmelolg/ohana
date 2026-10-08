import type { ReminderChannel } from '@ohana/shared';

/** Promemoria in modifica: `offset` in minuti prima dell'impegno. */
export interface ReminderDraft {
  id: string;
  offset: number;
  email: boolean;
  push: boolean;
}

export const REMINDER_OPTIONS: [minutes: number, label: string][] = [
  [0, 'All’ora dell’impegno'],
  [60, '1 ora prima'],
  [180, '3 ore prima'],
  [1440, '1 giorno prima'],
  [2880, '2 giorni prima'],
  [10080, '1 settimana prima'],
];

export function reminderLabel(minutes: number): string {
  const known = REMINDER_OPTIONS.find(([m]) => m === minutes);
  if (known) {
    return known[1];
  }
  if (minutes % 1440 === 0) {
    return `${minutes / 1440} giorni prima`;
  }
  if (minutes % 60 === 0) {
    return `${minutes / 60} ore prima`;
  }
  return `${minutes} minuti prima`;
}

export const channelsOf = (r: ReminderDraft): ReminderChannel[] => {
  const channels: ReminderChannel[] = [];
  if (r.email) {
    channels.push('email');
  }
  if (r.push) {
    channels.push('push');
  }
  return channels;
};

interface DefaultsFrom {
  /** minuti scritti nel testo («ricordamelo 2 giorni prima») */
  fromText: number | null | undefined;
  /** preferenza del profilo */
  profileDefault: number | undefined;
}

/** Promemoria proposti per un nuovo impegno: quello scritto nel testo, altrimenti il predefinito del profilo (1 giorno prima). */
export function initialReminders({ fromText, profileDefault }: DefaultsFrom): ReminderDraft[] {
  return [
    {
      id: fromText != null ? 'p' : 'default',
      offset: fromText ?? profileDefault ?? 1440,
      email: true,
      push: true,
    },
  ];
}

/** Dall'impegno salvato ai promemoria modificabili. */
export function remindersFromEvent(
  rows: { id: string; offset_minutes: number; channels: string[] }[],
): ReminderDraft[] {
  return rows.map((r) => ({
    id: r.id,
    offset: r.offset_minutes,
    email: r.channels.includes('email'),
    push: r.channels.includes('push'),
  }));
}
