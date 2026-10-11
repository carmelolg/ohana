import { MINUTE_MS, romeParts, romeToDate } from '@ohana/shared';

export interface SnoozeOption {
  label: string;
  minutes: number;
}

const EVENING_HOUR = 20;
const HOUR_MIN = 60;
const DAY_MIN = 1440;

/** Opzioni rapide di «Rimanda»: «stasera» compare solo se le 20:00 di Roma sono ancora davanti. */
export function snoozeOptions(now: Date): SnoozeOption[] {
  const { y, m, d } = romeParts(now);
  const evening = romeToDate(y, m, d, EVENING_HOUR);
  const toEvening = Math.round((evening.getTime() - now.getTime()) / MINUTE_MS);
  return [
    { label: 'Tra 1 ora', minutes: HOUR_MIN },
    ...(toEvening > HOUR_MIN ? [{ label: 'Stasera', minutes: toEvening }] : []),
    { label: 'Domani', minutes: DAY_MIN },
  ];
}

/** Messaggio del toast dopo «Rimanda». */
export function snoozeMessage(minutes: number): string {
  if (minutes >= DAY_MIN) {
    return 'Rimandato a domani';
  }
  return minutes === HOUR_MIN ? 'Rimandato di 1 ora' : 'Rimandato a stasera';
}
