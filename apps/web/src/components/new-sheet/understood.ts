import { describeRruleShort, type ParsedEvent } from '@ohana/shared';

export interface UnderstoodChip {
  k: string;
  v: string;
}

interface Names {
  spaces: { id: string; name: string }[];
  members: { id: string; name: string }[];
}

const DAY = new Intl.DateTimeFormat('it-IT', {
  timeZone: 'Europe/Rome',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});
const TIME = new Intl.DateTimeFormat('it-IT', {
  timeZone: 'Europe/Rome',
  hour: '2-digit',
  minute: '2-digit',
});

/** I campi che il parser ha riconosciuto dal testo libero, nell'ordine in cui li mostra la card «Ho capito». */
export function understoodChips(parsed: ParsedEvent | null, names: Names): UnderstoodChip[] {
  if (!parsed) {
    return [];
  }
  const chips: UnderstoodChip[] = [];
  if (parsed.startsAt) {
    chips.push({ k: 'Quando', v: parsed.startsAt ? DAY.format(parsed.startsAt) : '' });
    if (parsed.hasTime) {
      chips.push({ k: 'Ora', v: TIME.format(parsed.startsAt) });
    }
  }
  if (parsed.rrule) {
    chips.push({ k: 'Ripete', v: describeRruleShort(parsed.rrule) });
  }
  const person = names.members.find((m) => m.id === parsed.assigneeId);
  if (person) {
    chips.push({ k: 'Per', v: person.name });
  }
  const space = names.spaces.find((s) => s.id === parsed.spaceId);
  if (space) {
    chips.push({ k: 'Spazio', v: space.name });
  }
  if (parsed.categoryRecognized) {
    chips.push({ k: 'Categoria', v: parsed.category });
  }
  if (parsed.reminderMinutes) {
    chips.push({ k: 'Promemoria', v: `${parsed.reminderMinutes} min prima` });
  }
  return chips;
}
