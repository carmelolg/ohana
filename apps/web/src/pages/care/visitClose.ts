import { parseCareNumber } from '@ohana/shared';
import type { MedicationChange, VisitFollowUp, VisitOutcome } from '../../lib/api/careVisit';
import type { CareThread, EventRow, Medication } from '../../lib/types';

export interface VisitCloseForm {
  threadId: string;
  text: string;
  /** Valori come scritti, per chiave («blood_pressure» → «132/80»). */
  readings: Record<string, string>;
  /** Farmaco modificato (vuoto = nessuna modifica alla terapia). */
  changeMedId: string;
  newStrength: string;
  newDoseUnits: string;
  nextCheckMonths: number | null;
  followUps: VisitFollowUp[];
}

export const initialVisitCloseForm = (suggestedThreadId: string): VisitCloseForm => ({
  threadId: suggestedThreadId,
  text: '',
  readings: {},
  changeMedId: '',
  newStrength: '',
  newDoseUnits: '',
  nextCheckMonths: null,
  followUps: [],
});

/** Messaggio se non si può salvare (serve solo il filone; il resto è facoltativo). */
export function visitCloseError(f: VisitCloseForm, meds: Medication[]): string | null {
  if (!f.threadId) {
    return 'Scegli a quale filone appartiene la visita';
  }
  if (f.changeMedId) {
    const med = meds.find((m) => m.id === f.changeMedId);
    const dose = f.newDoseUnits.trim() ? parseCareNumber(f.newDoseUnits) : med?.dose_units;
    if (!med || dose === null || dose === undefined || dose <= 0) {
      return 'Per la terapia modificata scrivi una dose valida';
    }
  }
  return null;
}

interface Context {
  entryId: string;
  visit: EventRow;
  thread: CareThread;
  meds: Medication[];
  scadenzaCategoryId: string | undefined;
}

function medicationChange(f: VisitCloseForm, meds: Medication[]): MedicationChange | null {
  const med = meds.find((m) => m.id === f.changeMedId);
  if (!med) {
    return null;
  }
  const dose = f.newDoseUnits.trim() ? parseCareNumber(f.newDoseUnits) : null;
  return { med, strength: f.newStrength.trim() || (med.strength ?? ''), doseUnits: dose ?? med.dose_units };
}

/** Dal modulo ai dati da salvare per la chiusura della visita. */
export function buildVisitOutcome(f: VisitCloseForm, c: Context): VisitOutcome {
  return {
    entryId: c.entryId,
    spaceId: c.visit.space_id,
    recipientId: c.thread.recipient_id,
    threadId: c.thread.id,
    threadTitle: c.thread.title,
    doctor: c.thread.doctor ?? c.visit.contacts?.name ?? null,
    visit: {
      id: c.visit.id,
      title: c.visit.title,
      startsAt: new Date(c.visit.starts_at),
      contactId: c.visit.contact_id,
      assigneeId: c.visit.assignee_id,
    },
    text: f.text,
    readings: f.readings,
    medication: medicationChange(f, c.meds),
    nextCheckMonths: f.nextCheckMonths,
    followUps: f.followUps.filter((x) => x.title.trim()),
    scadenzaCategoryId: c.scadenzaCategoryId,
  };
}
