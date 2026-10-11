import type { ReminderChannel, SpaceRole } from '@ohana/shared';

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  nickname: string | null;
  email: string;
  avatar_url: string | null;
  theme: 'light' | 'dark' | 'auto';
  accent: string;
  default_reminder_minutes: number;
  morning_brief: boolean;
  morning_brief_time: string;
  notify_email: boolean;
  notify_chores_push: boolean;
  scan_llm_fallback: boolean;
  timezone: string;
}
export interface Member {
  user_id: string;
  role: SpaceRole;
  profiles: Pick<Profile, 'id' | 'first_name' | 'last_name' | 'nickname' | 'avatar_url'>;
}
export interface Space {
  id: string;
  name: string;
  color_hue: number;
  icon: string;
  created_by: string;
  /** Funzioni spente per questo spazio (vedi `SPACE_FEATURES`). */
  disabled_features: string[];
  space_members: Member[];
}
export interface Reminder {
  id: string;
  event_id: string;
  offset_minutes: number;
  channels: ReminderChannel[];
}
export interface ChecklistItem {
  id: string;
  event_id: string;
  text: string;
  checked: boolean;
  position: number;
}
export interface Attachment {
  id: string;
  event_id: string | null;
  space_id: string;
  path: string;
  name: string;
}
export interface Contact {
  id: string;
  space_id: string;
  name: string;
  role: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  address_lat: number | null;
  address_lng: number | null;
  notes: string | null;
}
export interface Category {
  id: string;
  space_id: string;
  name: string;
  slug: string | null;
  keywords: string[];
  position: number;
}
export interface EventRow {
  id: string;
  space_id: string;
  title: string;
  category_id: string;
  categories: Pick<Category, 'name' | 'slug'> | null;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  location: string | null;
  location_lat: number | null;
  location_lng: number | null;
  notes: string | null;
  assignee_id: string | null;
  contact_id: string | null;
  rrule: string | null;
  amount: number | null;
  status: 'open' | 'done';
  kind: 'appuntamento' | 'faccenda';
  last_done_at: string | null;
  maintenance_id: string | null;
  care_thread_id: string | null;
  medication_id: string | null;
  /** Collegamento scelto dall'utente a una pratica (non è il passaggio che ha un impegno in calendario). */
  linked_procedure_id: string | null;
  /** Collegamento scelto dall'utente a una manutenzione (non è la scadenza generata, `maintenance_id`). */
  linked_maintenance_id: string | null;
  /** Calendario esterno da cui l'impegno è stato importato: in app è in sola lettura. */
  import_id: string | null;
  created_by: string;
  event_reminders: Reminder[];
  event_checklist_items: ChecklistItem[];
  attachments: Attachment[];
  contacts: Pick<Contact, 'name' | 'phone'> | null;
}
export interface Occurrence {
  key: string;
  event: EventRow;
  at: Date;
}
export interface ShoppingList {
  id: string;
  space_id: string;
  name: string;
}
export interface ShoppingItem {
  id: string;
  list_id: string;
  text: string;
  qty: string | null;
  category: string | null;
  checked: boolean;
  checked_by: string | null;
  checked_at: string | null;
  added_by: string;
  created_at: string;
}
export interface Expense {
  id: string;
  space_id: string;
  payer_id: string;
  amount: number;
  description: string;
  date: string;
  event_id: string | null;
  expense_shares: { user_id: string; amount: number }[];
}
export interface Settlement {
  id: string;
  space_id: string;
  from_id: string;
  to_id: string;
  amount: number;
  date: string;
}

export interface BoardNote {
  id: string;
  space_id: string;
  author_id: string;
  text: string;
  pinned: boolean;
  expires_at: string | null;
  notify_push: boolean;
  notified_at: string | null;
  created_at: string;
}
/** Ultima volta che l'utente ha aperto la bacheca di uno spazio (base del badge «nuove»). */
export interface BoardRead {
  space_id: string;
  read_at: string;
}
export interface VisitNote {
  id: string;
  event_id: string;
  author_id: string;
  text: string;
  created_at: string;
}
export interface FollowUp {
  id: string;
  event_id: string;
  title: string;
  due_hint: string | null;
  due_date: string | null;
  created_event_id: string | null;
}
export interface EmergencyContact {
  name: string;
  role: string;
  phone: string;
}
export interface EmergencyInfo {
  space_id: string;
  contacts: EmergencyContact[];
  address: string | null;
  intercom: string | null;
  allergies: string | null;
  notes: string | null;
  updated_at: string;
}
export interface Maintenance {
  id: string;
  space_id: string;
  title: string;
  rrule: string;
  last_done_at: string | null;
  last_cost: number | null;
  contact_id: string | null;
  template_key: string | null;
  events: { id: string; starts_at: string; status: 'open' | 'done' }[];
}
/** Una esecuzione di una manutenzione (riga del registro): data, costo e professionista di quella volta. */
export interface MaintenanceLog {
  id: string;
  space_id: string;
  maintenance_id: string;
  done_on: string;
  cost: number | null;
  contact_id: string | null;
  note: string | null;
  created_by: string | null;
}
export interface ProcedureStep {
  id: string;
  procedure_id: string;
  position: number;
  title: string;
  note: string | null;
  done_at: string | null;
  event_id: string | null;
  /** Importo della fase (preventivo, saldo…), se ce n'è uno. */
  amount: number | null;
  /** Ditta o professionista della fase (rubrica). */
  contact_id: string | null;
  /** Esito di un preventivo messo a confronto. */
  quote_outcome: 'scelto' | 'scartato' | null;
}
export interface ProcedureDoc {
  id: string;
  procedure_id: string;
  name: string;
  attachment_id: string | null;
  /** Fase a cui appartiene il documento (preventivo, conferma d'ordine, fattura). */
  step_id: string | null;
}
export interface Procedure {
  id: string;
  space_id: string;
  title: string;
  owner_id: string | null;
  due_date: string | null;
  status: 'in_corso' | 'completata' | 'archiviata';
  template_key: string | null;
  procedure_steps: ProcedureStep[];
  procedure_docs: ProcedureDoc[];
}
export interface DocumentRow {
  id: string;
  space_id: string;
  title: string;
  folder: string;
  attachment_id: string | null;
  doc_type: string | null;
  extracted_json: Record<string, unknown> | null;
  expires_at: string | null;
  created_at: string;
  attachments: { path: string; name: string } | null;
}

export * from './types-care';
