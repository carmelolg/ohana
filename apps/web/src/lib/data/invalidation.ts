/**
 * Quali query (per prefisso della chiave) vanno ricaricate quando una tabella cambia.
 * È usata sia dopo una scrittura locale (`useMutate`) sia dagli eventi realtime (`useRealtimeSync`).
 */
export const TABLE_KEYS: Record<string, string[]> = {
  events: ['events', 'event', 'maintenances', 'care'], // le manutenzioni incorporano i loro eventi (prossima scadenza)
  event_reminders: ['events', 'event'],
  event_checklist_items: ['events', 'event'],
  shopping_items: ['shopping'],
  shopping_lists: ['shopping'],
  expenses: ['expenses'],
  expense_shares: ['expenses'],
  settlements: ['expenses'],
  contacts: ['contacts', 'events'],
  categories: ['categories', 'events', 'event'],
  board_notes: ['board'],
  board_reads: ['board-reads'],
  visit_notes: ['visit'],
  follow_ups: ['visit', 'care'], // i prossimi passi del diario compaiono anche nel filone della visita
  emergency_info: ['emergency'],
  maintenances: ['maintenances', 'events'],
  calendar_imports: ['calendar-imports'],
  maintenance_log: ['maintenances'],
  procedures: ['procedures'],
  procedure_steps: ['procedures'],
  procedure_docs: ['procedures'],
  documents: ['documents'],
  attachments: ['events', 'event', 'documents', 'procedures'],
  category_feedback: ['feedback'],
  care_recipients: ['care'],
  care_threads: ['care'],
  care_entries: ['care'],
  care_files: ['care'],
  medications: ['care'],
  medication_doses: ['care'],
  measurements: ['care'],
  visit_prep: ['care'],
  visit_questions: ['care'],
  care_audit: ['care'],
  space_members: ['spaces'],
  profiles: ['spaces'],
};

/** Tabelle che invalidano le query dopo una scrittura ma non sono nella pubblicazione realtime (nessun bisogno di aggiornamenti live). */
export const NOT_REALTIME = new Set(['category_feedback', 'care_audit', 'calendar_imports']);

/** Tabelle da ascoltare in realtime: DEVONO stare nella pubblicazione `supabase_realtime`, altrimenti l'intera sottoscrizione fallisce in silenzio. */
export const REALTIME_TABLES = Object.keys(TABLE_KEYS).filter((t) => !NOT_REALTIME.has(t));
