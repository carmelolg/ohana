import {
  describeRrule,
  findMaintenanceTemplate,
  MAINTENANCE_TEMPLATES,
  nextMaintenanceDate,
  type MaintenanceTemplate,
} from '@ohana/shared';
import { fromDateInput } from '../../lib/date-input';
import type { Maintenance } from '../../lib/types';

export type FormState =
  | { mode: 'new'; template: MaintenanceTemplate; text: string; rrule?: string }
  | { mode: 'edit'; m: Maintenance };

export type RuleOption = [rrule: string, label: string];

const RULE_PRESETS: RuleOption[] = [
  ['FREQ=YEARLY', 'Ogni anno'],
  ['FREQ=YEARLY;INTERVAL=2', 'Ogni 2 anni'],
  ['FREQ=MONTHLY;INTERVAL=6', 'Ogni 6 mesi'],
  ['FREQ=MONTHLY;INTERVAL=3', 'Ogni 3 mesi'],
  ['FREQ=MONTHLY', 'Ogni mese'],
];
const CUSTOM_TEMPLATE = MAINTENANCE_TEMPLATES[MAINTENANCE_TEMPLATES.length - 1];

/** Il modello di partenza: quello scelto (nuova) oppure quello della manutenzione esistente. */
export function templateOf(state: FormState): MaintenanceTemplate {
  return state.mode === 'new'
    ? state.template
    : (findMaintenanceTemplate(state.m.template_key) ?? CUSTOM_TEMPLATE);
}

/** Ripetizioni proposte: i preset, più quella del modello (in testa) e quella corrente (in coda) se non sono tra i preset. */
export function ruleOptions(template: MaintenanceTemplate, current: string): RuleOption[] {
  const known = (rule: string) => RULE_PRESETS.some(([v]) => v === rule);
  const fromTemplate: RuleOption[] =
    template.rrule && !known(template.rrule)
      ? [[template.rrule, `${template.hint[0].toUpperCase()}${template.hint.slice(1)}`]]
      : [];
  const fromCurrent: RuleOption[] =
    !known(current) && current !== template.rrule ? [[current, describeRrule(current)]] : [];
  return [...fromTemplate, ...RULE_PRESETS, ...fromCurrent];
}

/** Prossima scadenza calcolata dalla regola e dall'ultima volta; se la regola non ha futuro, oggi. */
export function computeNext(rrule: string, lastDone: string, now: Date): Date {
  try {
    return nextMaintenanceDate(rrule, lastDone ? fromDateInput(lastDone) : null, now);
  } catch {
    return now;
  }
}

/** Titolo iniziale: quello esistente, quello del modello, o il testo scritto nel «+». */
export function initialTitle(state: FormState, template: MaintenanceTemplate): string {
  if (state.mode === 'edit') {
    return state.m.title;
  }
  return template.title || state.text.trim();
}

/** Regola iniziale: quella esistente, quella dedotta dal testo, o quella del modello. */
export function initialRule(state: FormState, template: MaintenanceTemplate): string {
  return state.mode === 'edit' ? state.m.rrule : (state.rrule ?? template.rrule);
}
