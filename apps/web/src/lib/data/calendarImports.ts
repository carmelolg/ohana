import { supabase } from '../supabase';
import { useAuthedQuery } from './query';

/** Un calendario esterno collegato a uno spazio. L'indirizzo non c'è: il database lo custodisce e non lo restituisce. */
export interface CalendarImport {
  id: string;
  space_id: string;
  user_id: string;
  name: string;
  last_synced_at: string | null;
  /** Messaggio già pronto per l'utente dell'ultimo tentativo fallito. */
  last_error: string | null;
}

// Colonne nominate una a una: `url` è scrivibile ma non leggibile dal client, quindi `select('*')` verrebbe rifiutato.
const COLUMNS = 'id, space_id, user_id, name, last_synced_at, last_error';

export const useCalendarImports = () =>
  useAuthedQuery<CalendarImport[]>(['calendar-imports'], () =>
    supabase.from('calendar_imports').select(COLUMNS).order('created_at'),
  );
