import { parseMoneyInput } from '@ohana/shared';
import { useAuth } from '../../lib/auth';
import { useCategories, useMutate, type Mutate } from '../../lib/data';
import { newId } from '../../lib/outbox';
import type { Maintenance } from '../../lib/types';

/** Dati minimi per creare l'evento «scadenza» di una manutenzione. */
export interface Schedulable {
  id: string;
  space_id: string;
  title: string;
  contact_id: string | null;
}
export type Scheduler = (m: Schedulable, due: Date) => Promise<void>;

/** Crea l'evento «scadenza» che rappresenta la prossima occorrenza della manutenzione, con il promemoria predefinito dell'utente. */
export function useScheduler(): Scheduler {
  const { session, profile } = useAuth();
  const { data: categories = [] } = useCategories();
  const mutate = useMutate();
  return async (m, due) => {
    const categoryId = categories.find((c) => c.space_id === m.space_id && c.slug === 'scadenza')?.id;
    const eventId = newId();
    await mutate({
      table: 'events',
      action: 'upsert',
      payload: {
        id: eventId,
        space_id: m.space_id,
        title: m.title,
        ...(categoryId ? { category_id: categoryId } : {}),
        starts_at: due.toISOString(),
        all_day: false,
        contact_id: m.contact_id,
        maintenance_id: m.id,
        created_by: session!.user.id,
      },
    });
    await mutate({
      table: 'event_reminders',
      action: 'upsert',
      payload: {
        id: newId(),
        event_id: eventId,
        offset_minutes: profile?.default_reminder_minutes ?? 1440,
        channels: ['email', 'push'],
      },
    });
  };
}

interface Execution {
  doneOn: string;
  cost: number | null;
  contactId: string | null;
}

/** Aggiunge un intervento al registro: è ciò che la linea del tempo mostra (la manutenzione tiene solo l'ultimo). */
async function logExecution(
  mutate: Mutate,
  m: Pick<Maintenance, 'id' | 'space_id'>,
  e: Execution,
): Promise<void> {
  await mutate({
    table: 'maintenance_log',
    action: 'upsert',
    payload: {
      id: newId(),
      space_id: m.space_id,
      maintenance_id: m.id,
      done_on: e.doneOn,
      cost: e.cost,
      contact_id: e.contactId,
    },
  });
}

export interface MaintenanceInput {
  /** Presente in modifica. */
  editing: Maintenance | null;
  spaceId: string;
  title: string;
  rrule: string;
  contactId: string;
  /** `YYYY-MM-DD` o vuoto. */
  lastDone: string;
  cost: string;
  templateKey: string;
  dueDate: Date;
}

/** Crea o aggiorna la manutenzione e tiene allineata la sua scadenza nel calendario. */
export async function saveMaintenance(
  mutate: Mutate,
  schedule: Scheduler,
  input: MaintenanceInput,
): Promise<void> {
  const { editing, dueDate } = input;
  const fields = {
    title: input.title,
    rrule: input.rrule,
    contact_id: input.contactId || null,
    last_done_at: input.lastDone || null,
    last_cost: parseMoneyInput(input.cost),
  };
  if (!editing) {
    const row = { id: newId(), space_id: input.spaceId, template_key: input.templateKey, ...fields };
    await mutate({ table: 'maintenances', action: 'upsert', payload: row });
    if (input.lastDone) {
      await logExecution(mutate, row, {
        doneOn: input.lastDone,
        cost: fields.last_cost,
        contactId: fields.contact_id,
      });
    }
    return schedule(row, dueDate);
  }
  await mutate({ table: 'maintenances', action: 'update', payload: fields, match: { id: editing.id } });
  const open = editing.events.find((e) => e.status === 'open');
  if (open) {
    await mutate({
      table: 'events',
      action: 'update',
      payload: { title: input.title, contact_id: fields.contact_id, starts_at: dueDate.toISOString() },
      match: { id: open.id },
    });
  } else {
    await schedule(
      { id: editing.id, space_id: editing.space_id, title: input.title, contact_id: fields.contact_id },
      dueDate,
    );
  }
}

export async function deleteMaintenance(mutate: Mutate, id: string): Promise<void> {
  await mutate({ table: 'maintenances', action: 'delete', match: { id } });
}

interface Completion {
  doneAt: Date;
  doneOn: string;
  cost: string;
  contactId: string;
  next: Date;
}

/** «Segna fatta»: aggiorna ultima volta e costo, chiude la scadenza aperta e crea la successiva. */
export async function completeMaintenance(
  mutate: Mutate,
  schedule: Scheduler,
  m: Maintenance,
  c: Completion,
): Promise<void> {
  const contactId = c.contactId || null;
  const cost = parseMoneyInput(c.cost);
  await mutate({
    table: 'maintenances',
    action: 'update',
    payload: { last_done_at: c.doneOn, last_cost: cost, contact_id: contactId },
    match: { id: m.id },
  });
  await logExecution(mutate, m, { doneOn: c.doneOn, cost, contactId });
  for (const e of m.events.filter((x) => x.status === 'open')) {
    await mutate({
      table: 'events',
      action: 'update',
      payload: { status: 'done', last_done_at: c.doneAt.toISOString() },
      match: { id: e.id },
    });
  }
  await schedule({ id: m.id, space_id: m.space_id, title: m.title, contact_id: contactId }, c.next);
}
