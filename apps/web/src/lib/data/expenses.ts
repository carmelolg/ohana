import { useMemo } from 'react';
import { supabase } from '../supabase';
import type { Expense, Settlement } from '../types';
import { useAuthedQuery } from './query';

export const useExpenses = () =>
  useAuthedQuery<Expense[]>(['expenses', 'list'], () =>
    supabase
      .from('expenses')
      .select('*, expense_shares(user_id, amount)')
      .order('date', { ascending: false }),
  );

export const useSettlements = () =>
  useAuthedQuery<Settlement[]>(['expenses', 'settlements'], () =>
    supabase.from('settlements').select('*').order('date', { ascending: false }),
  );

/** Spese collegate a un impegno (`event_id`): per l'editor e per il pulsante «+ Spesa». */
export function useEventExpenses(eventId: string | undefined): Expense[] {
  const { data: expenses = [] } = useExpenses();
  return useMemo(() => expenses.filter((e) => e.event_id === eventId), [expenses, eventId]);
}
