import { romeParts, startOfDayRome, type ParsedEvent } from '@ohana/shared';
import type { EventRow } from '../../lib/types';
import { choreRules, EVENT_RULES, weeklyRuleOn, type RuleOption } from './recurrence-options';

/** Valori scelti a mano: quando presenti prevalgono su ciò che il parser ha capito dal testo. */
export interface Overrides {
  spaceId?: string;
  startsAt?: Date | null;
  categoryId?: string;
  contactId?: string | null;
  assigneeId?: string | null;
  rrule?: string;
  kind?: 'appuntamento' | 'faccenda';
}

interface Inputs {
  overrides: Overrides;
  parsed: ParsedEvent | null;
  existing: EventRow | null;
  /** `?tipo=faccenda` nell'indirizzo (arriva dal «+»). */
  requestedKind: string | null;
  defaultSpaceId: string | undefined;
  userId: string | undefined;
  now: Date;
}

export interface EventValues {
  spaceId: string;
  isChore: boolean;
  startsAt: Date | null;
  /** Giorno della settimana (0 = domenica) di `startsAt`, o di oggi se manca: ancora delle ripetizioni delle faccende. */
  weekday: number;
  contactId: string | null;
  assigneeId: string | null;
  rrule: string;
  ruleOptions: RuleOption[];
}

/** Un valore scelto a mano (anche `null`, cioè «nessuno») vince su quello capito dal testo. */
const manualOr = <T>(manual: T | undefined, fromText: T | undefined): T | undefined =>
  manual !== undefined ? manual : fromText;

// faccenda: impegno ricorrente a bassa priorità, assegnato, senza orario (solo giorno; se manca, oggi)
function isChoreFrom({ overrides, existing, requestedKind, parsed }: Inputs): boolean {
  if (overrides.kind !== undefined) {
    return overrides.kind === 'faccenda';
  }
  if (existing) {
    return existing.kind === 'faccenda';
  }
  return requestedKind === 'faccenda' || parsed?.kind === 'faccenda';
}

const startOf = ({ overrides, parsed, now }: Inputs, isChore: boolean): Date | null => {
  const raw = manualOr(overrides.startsAt, parsed?.startsAt) ?? null;
  return isChore ? startOfDayRome(raw ?? now) : raw;
};

/** Una faccenda senza assegnatario scelto è di chi la crea. */
const assigneeOf = ({ overrides, parsed, userId }: Inputs, isChore: boolean): string | null =>
  manualOr(overrides.assigneeId, parsed?.assigneeId) ?? (isChore ? userId : undefined) ?? null;

/** Una faccenda senza ripetizione si ripete ogni settimana, nello stesso giorno. */
const ruleOf = ({ overrides, parsed }: Inputs, isChore: boolean, weekday: number): string => {
  const chosen = overrides.rrule ?? parsed?.rrule ?? ''; // «non si ripete» scelto a mano (stringa vuota) vince sul testo
  return chosen || (isChore ? weeklyRuleOn(weekday) : '');
};

/** Sceglie, per ogni campo, il valore dell'utente se c'è, altrimenti quello capito dal testo, altrimenti il predefinito. */
export function resolveEventValues(input: Inputs): EventValues {
  const { overrides, parsed, defaultSpaceId, now } = input;
  const isChore = isChoreFrom(input);
  const startsAt = startOf(input, isChore);
  const weekday = romeParts(startsAt ?? now).dow;
  return {
    spaceId: overrides.spaceId ?? parsed?.spaceId ?? defaultSpaceId ?? '',
    isChore,
    startsAt,
    weekday,
    contactId: manualOr(overrides.contactId, parsed?.contactId) ?? null,
    assigneeId: assigneeOf(input, isChore),
    rrule: ruleOf(input, isChore, weekday),
    ruleOptions: isChore ? choreRules(weekday) : EVENT_RULES,
  };
}
