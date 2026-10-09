import {
  isoDayRome,
  measuresFromReadings,
  parseCareNumber,
  parsePressure,
  romeParts,
  romeToDate,
  therapyChangeTitle,
} from '@ohana/shared';
import type { Mutate } from '../data';
import { newId } from '../outbox';
import type { Medication } from '../types';
import { createCareEvent } from './careEvents';

export interface VisitFollowUp {
  title: string;
  /** `YYYY-MM-DD`, se la data è già nota. */
  dueDate: string;
  /** Scadenza in parole («6 mesi»). */
  hint: string;
}

export interface MedicationChange {
  med: Medication;
  strength: string;
  doseUnits: number;
}

export interface VisitOutcome {
  entryId: string;
  spaceId: string;
  recipientId: string;
  threadId: string;
  threadTitle: string;
  doctor: string | null;
  visit: { id: string; title: string; startsAt: Date; contactId: string | null; assigneeId: string | null };
  text: string;
  /** Valori come scritti nel modulo, per chiave: «blood_pressure» → «132/80». */
  readings: Record<string, string>;
  medication: MedicationChange | null;
  /** Tra quanti mesi rivedere il medico; vuoto = nessun promemoria. */
  nextCheckMonths: number | null;
  followUps: VisitFollowUp[];
  scadenzaCategoryId: string | undefined;
}

/** Ogni quanto si può rivedere il medico, in mesi. */
export const NEXT_CHECK_OPTIONS = [1, 2, 3, 4, 6, 12] as const;

const REMINDER_DAYS_BEFORE = 7;
const MINUTES_PER_DAY = 1440;

/** Valori del modulo → valori del tassello: numeri dove possibile, la pressione resta «132/80», i campi vuoti spariscono. */
export function parseReadings(raw: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, text] of Object.entries(raw)) {
    const value =
      key === 'blood_pressure' ? (parsePressure(text) ? text.trim() : null) : parseCareNumber(text);
    if (value !== null) {
      out[key] = value;
    }
  }
  return out;
}

const addMonths = (from: Date, months: number): Date => {
  const p = romeParts(from);
  return romeToDate(p.y, p.m + months, p.d, 9, 0);
};

async function changeTherapy(mutate: Mutate, o: VisitOutcome, change: MedicationChange, date: string) {
  const { med } = change;
  await mutate({
    table: 'medications',
    action: 'update',
    payload: { strength: change.strength.trim() || null, dose_units: change.doseUnits },
    match: { id: med.id },
  });
  await mutate({
    table: 'care_entries',
    action: 'upsert',
    payload: {
      id: newId(),
      space_id: o.spaceId,
      recipient_id: o.recipientId,
      thread_id: o.threadId,
      type: 'terapia',
      entry_date: date,
      title: therapyChangeTitle({
        name: med.name,
        from: { strength: med.strength, doseUnits: med.dose_units, unit: med.unit },
        to: { strength: change.strength.trim() || null, doseUnits: change.doseUnits, unit: med.unit },
      }),
      text: o.doctor ? `Deciso dal ${o.doctor}.` : null,
      medication_id: med.id,
    },
  });
}

async function createFollowUps(mutate: Mutate, o: VisitOutcome) {
  const items: {
    title: string;
    due_date: string | null;
    due_hint: string | null;
    event_id: string | null;
  }[] = [];
  for (const f of o.followUps.filter((x) => x.title.trim())) {
    const at = /^(\d{4})-(\d{2})-(\d{2})$/.exec(f.dueDate);
    const eventId = at
      ? await createCareEvent(mutate, {
          spaceId: o.spaceId,
          title: f.title.trim(),
          startsAt: romeToDate(+at[1], +at[2], +at[3], 9, 0),
          categoryId: o.scadenzaCategoryId,
          assigneeId: o.visit.assigneeId,
          contactId: o.visit.contactId,
          careThreadId: o.threadId,
        })
      : null;
    items.push({
      title: f.title.trim(),
      due_date: at ? f.dueDate : null,
      due_hint: f.hint.trim() || null,
      event_id: eventId,
    });
  }
  if (o.nextCheckMonths) {
    const due = addMonths(o.visit.startsAt, o.nextCheckMonths);
    const eventId = await createCareEvent(mutate, {
      spaceId: o.spaceId,
      title: `Controllo ${o.threadTitle.toLowerCase()}`,
      startsAt: due,
      categoryId: o.scadenzaCategoryId,
      assigneeId: o.visit.assigneeId,
      contactId: o.visit.contactId,
      careThreadId: o.threadId,
      notes: 'Esami e visita di controllo: da prenotare.',
      remindBeforeMinutes: REMINDER_DAYS_BEFORE * MINUTES_PER_DAY,
    });
    items.push({
      title: 'Prossimo controllo',
      due_date: isoDayRome(due),
      due_hint: `tra ${o.nextCheckMonths} mesi`,
      event_id: eventId,
    });
  }
  return items;
}

/**
 * Chiusura di una visita (4c): il tassello nel filone, l'eventuale cambio di terapia (che aggiorna la scheda del
 * farmaco e aggiunge un tassello `terapia`), i prossimi passi come impegni e il collegamento tra impegno e filone.
 * I file del referto si caricano dopo, dalla schermata (richiedono la rete).
 */
export async function saveVisitOutcome(mutate: Mutate, o: VisitOutcome): Promise<void> {
  const date = isoDayRome(o.visit.startsAt);
  const readings = parseReadings(o.readings);
  const followUps = await createFollowUps(mutate, o);
  await mutate({
    table: 'care_entries',
    action: 'upsert',
    payload: {
      id: o.entryId,
      space_id: o.spaceId,
      recipient_id: o.recipientId,
      thread_id: o.threadId,
      type: 'visita',
      entry_date: date,
      title: o.visit.title,
      text: o.text.trim() || null,
      readings,
      follow_ups: followUps,
      event_id: o.visit.id,
    },
  });
  if (o.medication) {
    await changeTherapy(mutate, o, o.medication, date);
  }
  await mutate({
    table: 'events',
    action: 'update',
    payload: { care_thread_id: o.threadId },
    match: { id: o.visit.id },
  });
  for (const m of measuresFromReadings(readings)) {
    await mutate({
      table: 'measurements',
      action: 'upsert',
      payload: {
        id: newId(),
        space_id: o.spaceId,
        recipient_id: o.recipientId,
        thread_id: o.threadId,
        type: m.type,
        value: m.value,
        value2: m.value2,
        measured_at: o.visit.startsAt.toISOString(),
        note: o.visit.title,
      },
    });
  }
}
