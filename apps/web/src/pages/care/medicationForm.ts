import { estimateStock, parseCareNumber, type DoseKey } from '@ohana/shared';
import type { MedicationToSave } from '../../lib/api/medications';
import type { Medication } from '../../lib/types';

export interface MedForm {
  name: string;
  strength: string;
  doseUnits: string;
  unit: string;
  schedule: string[];
  notes: string;
  threadId: string;
  prescriber: string;
  refillBy: string;
  packageUnits: string;
  stock: string;
  planDate: string;
  planIssuer: string;
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Scorta stimata, scritta come nel campo (una cifra decimale al massimo, virgola all'italiana). */
export const stockText = (n: number): string => String(Math.round(n * 10) / 10).replace('.', ',');

/** Valori iniziali del modulo: vuoti per un farmaco nuovo, quelli della scheda (con scorta stimata adesso) per uno esistente. */
export function initialMedForm(existing: Medication | null, doses: DoseKey[], now: Date): MedForm {
  if (!existing) {
    return {
      name: '',
      strength: '',
      doseUnits: '1',
      unit: 'cpr',
      schedule: ['08:00'],
      notes: '',
      threadId: '',
      prescriber: '',
      refillBy: '',
      packageUnits: '',
      stock: '',
      planDate: '',
      planIssuer: '',
    };
  }
  return {
    name: existing.name,
    strength: existing.strength ?? '',
    doseUnits: String(existing.dose_units).replace('.', ','),
    unit: existing.unit,
    schedule: existing.schedule,
    notes: existing.notes ?? '',
    threadId: existing.thread_id ?? '',
    prescriber: existing.prescriber ?? '',
    refillBy: existing.refill_by ?? '',
    packageUnits: existing.package_units ? String(existing.package_units) : '',
    stock: stockText(estimateStock(existing, doses, now)),
    planDate: existing.plan_expires_at ?? '',
    planIssuer: existing.plan_issuer ?? '',
  };
}

/** Messaggio per l'utente se il modulo non si può salvare, altrimenti `null`. */
export function medFormError(f: MedForm): string | null {
  if (!f.name.trim()) {
    return 'Scrivi il nome del farmaco';
  }
  const dose = parseCareNumber(f.doseUnits);
  if (dose === null || dose <= 0) {
    return 'La dose per assunzione deve essere un numero maggiore di zero';
  }
  if (f.schedule.some((t) => !TIME.test(t))) {
    return 'Controlla gli orari: servono ore e minuti';
  }
  const stock = f.stock.trim() ? parseCareNumber(f.stock) : 0;
  if (stock === null || stock < 0) {
    return 'La scorta deve essere un numero (zero o più)';
  }
  return null;
}

interface Context {
  id: string;
  spaceId: string;
  recipientId: string;
  existing: Medication | null;
  /** Il modulo mostrato all'apertura: serve a capire cosa è cambiato. */
  initial: MedForm;
  now: Date;
}

const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/**
 * Dal modulo alla scheda da salvare. La scorta si riscrive (con l'istante di adesso) solo se serve: farmaco nuovo,
 * scorta corretta a mano, oppure orari/dose cambiati — in quel caso si «congela» la stima di adesso, così il nuovo
 * ritmo vale da qui in poi e non retroattivamente.
 */
export function buildMedication(f: MedForm, c: Context): MedicationToSave {
  const doseUnits = parseCareNumber(f.doseUnits) ?? 1;
  const stockValue = f.stock.trim() ? (parseCareNumber(f.stock) ?? 0) : 0;
  const rhythmChanged =
    !!c.existing && (!sameList(f.schedule, c.initial.schedule) || f.doseUnits !== c.initial.doseUnits);
  const stockEdited = f.stock !== c.initial.stock;
  const stock = !c.existing || stockEdited || rhythmChanged ? { units: stockValue, asOf: c.now } : null;
  const packageUnits = parseCareNumber(f.packageUnits);
  return {
    id: c.id,
    spaceId: c.spaceId,
    recipientId: c.recipientId,
    threadId: f.threadId || null,
    name: f.name,
    strength: f.strength,
    doseUnits,
    unit: f.unit,
    schedule: f.schedule,
    notes: f.notes,
    packageUnits: packageUnits && packageUnits > 0 ? Math.round(packageUnits) : null,
    prescriber: f.prescriber,
    refillBy: f.refillBy,
    planExpiresAt: f.planDate || null,
    planIssuer: f.planIssuer,
    stock,
  };
}
