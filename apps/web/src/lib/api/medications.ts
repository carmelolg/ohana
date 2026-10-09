import { addDaysRome, romeToDate, startOfDayRome } from '@ohana/shared';
import type { Mutate, OptimisticUpdate } from '../data';
import type { Medication, MedicationDose } from '../types';
import { createCareEvent } from './careEvents';

export interface MedicationToSave {
  id: string;
  spaceId: string;
  recipientId: string;
  threadId: string | null;
  name: string;
  strength: string;
  doseUnits: number;
  unit: string;
  schedule: string[];
  notes: string;
  packageUnits: number | null;
  prescriber: string;
  refillBy: string;
  planExpiresAt: string | null;
  planIssuer: string;
  /** Scorta da registrare ora (nuova terapia o correzione); vuoto = lascia com'è. */
  stock: { units: number; asOf: Date } | null;
}

export const saveMedication = (mutate: Mutate, m: MedicationToSave) =>
  mutate({
    table: 'medications',
    action: 'upsert',
    payload: {
      id: m.id,
      space_id: m.spaceId,
      recipient_id: m.recipientId,
      thread_id: m.threadId,
      name: m.name.trim(),
      strength: m.strength.trim() || null,
      dose_units: m.doseUnits,
      unit: m.unit.trim() || 'cpr',
      schedule: [...m.schedule].sort(),
      notes: m.notes.trim() || null,
      package_units: m.packageUnits,
      prescriber: m.prescriber.trim() || null,
      refill_by: m.refillBy.trim() || null,
      plan_expires_at: m.planExpiresAt || null,
      plan_issuer: m.planIssuer.trim() || null,
      ...(m.stock ? { stock_units: m.stock.units, stock_as_of: m.stock.asOf.toISOString() } : {}),
    },
  });

export const setMedicationActive = (mutate: Mutate, id: string, active: boolean) =>
  mutate({ table: 'medications', action: 'update', payload: { active }, match: { id } });

export const deleteMedication = (mutate: Mutate, id: string) =>
  mutate({ table: 'medications', action: 'delete', match: { id } });

/** Corregge la scorta: da questo istante le dosi non segnate si stimano a partire dal nuovo valore. */
export const correctStock = (mutate: Mutate, id: string, units: number, now: Date) =>
  mutate({
    table: 'medications',
    action: 'update',
    payload: { stock_units: units, stock_as_of: now.toISOString() },
    match: { id },
  });

const dosesCache = (patch: (doses: MedicationDose[]) => MedicationDose[]): OptimisticUpdate[] => [
  { key: ['care', 'doses'], patch: (old) => (Array.isArray(old) ? patch(old as MedicationDose[]) : old) },
];

export interface DoseTarget {
  spaceId: string;
  medicationId: string;
  /** `YYYY-MM-DD` */
  day: string;
  /** `HH:MM` */
  slot: string;
  userId: string;
}

/** Segna la dose come data. Idempotente (una dose per terapia, giorno e orario): la scorta scende una sola volta. */
export const markDoseTaken = (mutate: Mutate, d: DoseTarget) => {
  const taken_at = new Date().toISOString();
  // senza `id`: se la dose esiste già, l'upsert la riscrive senza cambiarne l'identità né la scorta
  const row = {
    space_id: d.spaceId,
    medication_id: d.medicationId,
    day: d.day,
    slot: d.slot,
    taken_by: d.userId,
    taken_at,
  };
  return mutate(
    { table: 'medication_doses', action: 'upsert', payload: row, onConflict: 'medication_id,day,slot' },
    dosesCache((doses) => [...doses, { ...row, id: `provvisoria-${d.medicationId}-${d.day}-${d.slot}` }]),
  );
};

export const unmarkDose = (mutate: Mutate, d: Omit<DoseTarget, 'userId'>) =>
  mutate(
    {
      table: 'medication_doses',
      action: 'delete',
      match: { medication_id: d.medicationId, day: d.day, slot: d.slot },
    },
    dosesCache((doses) =>
      doses.filter((x) => !(x.medication_id === d.medicationId && x.day === d.day && x.slot === d.slot)),
    ),
  );

export interface RefillRequest {
  med: Pick<Medication, 'id' | 'name' | 'space_id' | 'refill_by' | 'prescriber'>;
  /** Entro quando serve la ricetta. */
  dueDate: Date;
  assigneeId: string | null;
  categoryId: string | undefined;
}

/** «Chiedi ricetta»: una commissione per il medico di base, assegnata a chi se ne occupa. */
export function requestRefill(mutate: Mutate, r: RefillRequest): Promise<string> {
  const who = r.med.refill_by ?? r.med.prescriber;
  return createCareEvent(mutate, {
    spaceId: r.med.space_id,
    title: `Ricetta ${r.med.name.toLowerCase()}`,
    startsAt: r.dueDate,
    categoryId: r.categoryId,
    assigneeId: r.assigneeId,
    notes: who ? `Chiedere la ricetta a ${who}.` : 'Chiedere la ricetta al medico.',
    medicationId: r.med.id,
  });
}

/** Giorno entro cui chiedere la ricetta: il giorno prima che la scorta finisca, ma non nel passato. */
export function refillDueDate(daysLeft: number, now: Date): Date {
  return addDaysRome(startOfDayRome(now), Math.max(daysLeft - 1, 0));
}

/** Il promemoria del piano terapeutico: un impegno nel giorno di scadenza, con avviso 30 giorni prima. */
export const PLAN_REMINDER_DAYS = 30;
const MINUTES_PER_DAY = 1440;

export async function createPlanReminder(
  mutate: Mutate,
  input: {
    med: Pick<Medication, 'id' | 'name' | 'space_id'>;
    expiresAt: Date;
    assigneeId: string | null;
    categoryId: string | undefined;
  },
): Promise<string> {
  return createCareEvent(mutate, {
    spaceId: input.med.space_id,
    title: `Piano terapeutico ${input.med.name.toLowerCase()}`,
    startsAt: input.expiresAt,
    categoryId: input.categoryId,
    assigneeId: input.assigneeId,
    notes: 'Scade il piano terapeutico: serve il rinnovo dallo specialista.',
    medicationId: input.med.id,
    remindBeforeMinutes: PLAN_REMINDER_DAYS * MINUTES_PER_DAY,
  });
}

export const movePlanReminder = (mutate: Mutate, eventId: string, expiresAt: Date) =>
  mutate({
    table: 'events',
    action: 'update',
    payload: { starts_at: expiresAt.toISOString() },
    match: { id: eventId },
  });

export const deleteCareEvent = (mutate: Mutate, eventId: string) =>
  mutate({ table: 'events', action: 'delete', match: { id: eventId } });

export interface PlanSync {
  med: Pick<Medication, 'id' | 'name' | 'space_id'>;
  /** `YYYY-MM-DD` oppure vuoto se il piano non c'è (più). */
  planDate: string;
  /** Il promemoria già creato per questo piano, se esiste. */
  existingEventId: string | null;
  assigneeId: string | null;
  categoryId: string | undefined;
}

/** Tiene allineato il promemoria del piano terapeutico alla data scritta sulla scheda: crea, sposta o toglie. */
export async function syncPlanReminder(mutate: Mutate, p: PlanSync): Promise<void> {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(p.planDate);
  if (!match) {
    if (p.existingEventId) {
      await deleteCareEvent(mutate, p.existingEventId);
    }
    return;
  }
  const expiresAt = romeToDate(+match[1], +match[2], +match[3], 9, 0);
  if (p.existingEventId) {
    await movePlanReminder(mutate, p.existingEventId, expiresAt);
    return;
  }
  await createPlanReminder(mutate, {
    med: p.med,
    expiresAt,
    assigneeId: p.assigneeId,
    categoryId: p.categoryId,
  });
}
