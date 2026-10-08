import { BYDAY_CODES } from '@ohana/shared';

export type RuleOption = [rrule: string, label: string];

export const EVENT_RULES: RuleOption[] = [
  ['', 'Non si ripete'],
  ['FREQ=DAILY', 'Ogni giorno'],
  ['FREQ=WEEKLY', 'Ogni settimana'],
  ['FREQ=MONTHLY', 'Ogni mese'],
  ['FREQ=MONTHLY;INTERVAL=2', 'Ogni 2 mesi'],
  ['FREQ=YEARLY', 'Ogni anno'],
];

/** Regola settimanale «stesso giorno» di una data (`dow`: 0 = domenica). */
export const weeklyRuleOn = (dow: number): string => `FREQ=WEEKLY;BYDAY=${BYDAY_CODES[dow]}`;

/** Ripetizioni proposte per le faccende, ancorate al giorno della settimana scelto. */
export function choreRules(dow: number): RuleOption[] {
  const weekly = weeklyRuleOn(dow);
  return [
    ['FREQ=DAILY', 'Ogni giorno'],
    ['FREQ=DAILY;INTERVAL=3', 'Ogni 3 giorni'],
    [weekly, 'Ogni settimana (stesso giorno)'],
    [`FREQ=WEEKLY;INTERVAL=2;BYDAY=${BYDAY_CODES[dow]}`, 'Ogni 2 settimane'],
    ['FREQ=MONTHLY', 'Ogni mese'],
  ];
}
