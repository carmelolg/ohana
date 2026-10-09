export interface CareExemption {
  code?: string;
  label: string;
  expires_at: string | null;
}
export interface CareRecipient {
  id: string;
  space_id: string;
  first_name: string;
  last_name: string;
  label: string | null;
  birth_date: string | null;
  tax_code: string | null;
  photo_path: string | null;
  allergies: string[];
  exemptions: CareExemption[];
  caregiver_ids: string[];
  duty_user_id: string | null;
  /** Il membro di Ohana che è questa persona, se ha un account nello spazio. */
  user_id: string | null;
  created_by: string;
  created_at: string;
}
export interface CareThread {
  id: string;
  space_id: string;
  recipient_id: string;
  title: string;
  specialty: string | null;
  doctor: string | null;
  contact_id: string | null;
  color_hue: number;
  started_at: string | null;
  status: 'attivo' | 'chiuso';
  tracked_params: string[];
  created_at: string;
}
export interface CareFile {
  id: string;
  space_id: string;
  recipient_id: string;
  entry_id: string | null;
  name: string;
  path: string;
  created_at: string;
}
export interface CareEntry {
  id: string;
  space_id: string;
  recipient_id: string;
  thread_id: string;
  type: 'visita' | 'esame' | 'terapia' | 'episodio' | 'nota';
  entry_date: string;
  title: string;
  text: string | null;
  readings: Record<string, unknown>;
  follow_ups: {
    title: string;
    due_date?: string | null;
    due_hint?: string | null;
    event_id?: string | null;
  }[];
  author_id: string;
  event_id: string | null;
  medication_id: string | null;
  created_at: string;
  care_files: CareFile[];
}
export interface Medication {
  id: string;
  space_id: string;
  recipient_id: string;
  thread_id: string | null;
  name: string;
  strength: string | null;
  dose_units: number;
  unit: string;
  schedule: string[];
  notes: string | null;
  stock_units: number;
  stock_as_of: string;
  package_units: number | null;
  prescriber: string | null;
  refill_by: string | null;
  plan_expires_at: string | null;
  plan_issuer: string | null;
  active: boolean;
  created_at: string;
}
export interface MedicationDose {
  id: string;
  space_id: string;
  medication_id: string;
  day: string;
  slot: string;
  taken_by: string;
  taken_at: string;
}
export interface Measurement {
  id: string;
  space_id: string;
  recipient_id: string;
  thread_id: string | null;
  type: string;
  value: number;
  value2: number | null;
  measured_at: string;
  author_id: string;
  note: string | null;
}
export interface VisitQuestion {
  id: string;
  space_id: string;
  prep_id: string;
  text: string;
  author_id: string;
  done: boolean;
  position: number;
  created_at: string;
}
export interface VisitPrep {
  id: string;
  space_id: string;
  event_id: string;
  thread_id: string | null;
  bring: { text: string; done: boolean }[];
  visit_questions: VisitQuestion[];
}
