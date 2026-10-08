export interface ParseContext {
  spaces?: { id: string; name: string }[];
  /** `name` è il nome mostrato (soprannome o nome e cognome); `aliases` altri nomi con cui menzionarlo (es. il nome di battesimo). */
  members?: { id: string; name: string; aliases?: string[] }[];
  contacts?: { id: string; name: string }[];
  /** Categorie dello spazio: predefinite (con slug) e personalizzate (slug nullo, riconosciute da nome e parole chiave). */
  categories?: { id: string; slug: string | null; name: string; keywords: string[] }[];
  defaultReminderMinutes?: number;
}

export type TokenKind =
  'space' | 'assignee' | 'date' | 'time' | 'reminder' | 'recurrence' | 'contact' | 'category';
export interface Token {
  start: number;
  end: number;
  kind: TokenKind;
  text: string;
}

export type ParsedKind = 'appuntamento' | 'faccenda' | 'manutenzione' | 'pratica' | 'nota' | 'scansione';

export interface ParsedEvent {
  /** Cosa sta creando l'utente, dedotto dal testo libero. */
  kind: ParsedKind;
  /** Modello suggerito (manutenzione o pratica). */
  templateKey: string | null;
  /** Testo della nota, senza il prefisso «nota:». */
  noteText: string | null;
  title: string;
  startsAt: Date | null;
  hasTime: boolean;
  /** Slug se predefinita, altrimenti il nome della categoria personalizzata riconosciuta. */
  category: string;
  /** Id della categoria riconosciuta (solo se `ctx.categories` è fornito). */
  categoryId: string | null;
  categoryRecognized: boolean;
  spaceId: string | null;
  assigneeId: string | null;
  contactId: string | null;
  reminderMinutes: number | null;
  rrule: string | null;
  tokens: Token[];
}
