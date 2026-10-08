import { supabase } from '../supabase';
import { useAuthedQuery } from '../data/query';
import { unwrap } from './result';

export interface CalendarFeed {
  id: string;
  token: string;
  space_id: string | null;
}

/** Feed ICS dell'utente (uno per spazio, più uno per tutti gli spazi). */
export const useCalendarFeeds = (userId: string) =>
  useAuthedQuery<CalendarFeed[]>(['feeds'], () =>
    supabase.from('calendar_feeds').select('*').eq('user_id', userId),
  );

export async function createCalendarFeed(userId: string, spaceId: string | null): Promise<void> {
  unwrap(await supabase.from('calendar_feeds').insert({ user_id: userId, space_id: spaceId }));
}

export async function deleteCalendarFeed(id: string): Promise<void> {
  unwrap(await supabase.from('calendar_feeds').delete().eq('id', id));
}
