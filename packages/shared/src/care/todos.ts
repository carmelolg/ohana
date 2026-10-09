import { daysUntil } from '../maintenance';
import { formatNumericDate } from '../dates';
import { LOW_STOCK_DAYS, stockDaysLeft, type DoseKey, type StockMed } from './stock';
import type { FollowUpItem } from './visit';

/** Avviso sui piani terapeutici e le esenzioni in scadenza. */
export const EXPIRY_WARNING_DAYS = 30;

export type TodoKind = 'ricetta' | 'piano' | 'esenzione' | 'prossimo-passo';

export interface CareTodo {
  kind: TodoKind;
  key: string;
  title: string;
  detail: string;
  /** Giorni alla scadenza (negativo = scaduto); `null` se non c'è una data. */
  daysLeft: number | null;
  medicationId?: string;
}

interface TodoMed extends StockMed {
  id: string;
  name: string;
  active: boolean;
  plan_expires_at: string | null;
  refill_by: string | null;
  prescriber: string | null;
}

export interface TodoInput {
  medications: TodoMed[];
  doses: ({ medication_id: string } & DoseKey)[];
  exemptions: { code?: string; label: string; expires_at: string | null }[];
  followUps: FollowUpItem[];
  /** Terapie per cui esiste già un promemoria «chiedi ricetta» ancora aperto. */
  refillRequested: Set<string>;
  now: Date;
}

const dateOf = (iso: string) => new Date(iso + 'T09:00:00');

const when = (days: number, date: string) =>
  days < 0 ? `scaduto il ${formatNumericDate(dateOf(date))}` : `scade il ${formatNumericDate(dateOf(date))}`;

function refillTodos({ medications, doses, refillRequested, now }: TodoInput): CareTodo[] {
  return medications
    .filter((m) => m.active && !refillRequested.has(m.id))
    .flatMap((m) => {
      const left = stockDaysLeft(
        m,
        doses.filter((d) => d.medication_id === m.id),
        now,
      );
      if (left === null || left >= LOW_STOCK_DAYS) {
        return [];
      }
      const who = m.refill_by ?? m.prescriber;
      return [
        {
          kind: 'ricetta' as const,
          key: `ricetta:${m.id}`,
          title: `Ricetta ${m.name.toLowerCase()}`,
          detail: `${left <= 0 ? 'finita' : `finisce tra ${left} gg`}${who ? ` · ${who}` : ''}`,
          daysLeft: left,
          medicationId: m.id,
        },
      ];
    });
}

function expiryTodos({ medications, exemptions, now }: TodoInput): CareTodo[] {
  const plans = medications
    .filter((m) => m.active && m.plan_expires_at)
    .map((m) => ({
      kind: 'piano' as const,
      key: `piano:${m.id}`,
      title: `Piano terapeutico ${m.name.toLowerCase()}`,
      date: m.plan_expires_at!,
      medicationId: m.id,
    }));
  const exempt = exemptions
    .filter((e) => e.expires_at)
    .map((e) => ({
      kind: 'esenzione' as const,
      key: `esenzione:${e.code ?? e.label}`,
      title: `Esenzione ${e.label}`,
      date: e.expires_at!,
      medicationId: undefined,
    }));
  return [...plans, ...exempt]
    .map((x) => ({ ...x, days: daysUntil(dateOf(x.date), now) }))
    .filter((x) => x.days <= EXPIRY_WARNING_DAYS)
    .map((x) => ({
      kind: x.kind,
      key: x.key,
      title: x.title,
      detail: when(x.days, x.date),
      daysLeft: x.days,
      medicationId: x.medicationId,
    }));
}

function followUpTodos({ followUps, now }: TodoInput): CareTodo[] {
  return followUps
    .filter((f) => !f.event_id)
    .map((f, i) => ({
      kind: 'prossimo-passo' as const,
      key: `passo:${i}:${f.title}`,
      title: f.title,
      detail: f.due_hint ?? (f.due_date ? `entro il ${formatNumericDate(dateOf(f.due_date))}` : 'da fare'),
      daysLeft: f.due_date ? daysUntil(dateOf(f.due_date), now) : null,
    }));
}

/** «Da fare» di una persona: ricette da chiedere, piani ed esenzioni in scadenza, prossimi passi non ancora in calendario. */
export function careTodos(input: TodoInput): CareTodo[] {
  return [...refillTodos(input), ...expiryTodos(input), ...followUpTodos(input)].sort(
    (a, b) => (a.daysLeft ?? Number.MAX_SAFE_INTEGER) - (b.daysLeft ?? Number.MAX_SAFE_INTEGER),
  );
}
