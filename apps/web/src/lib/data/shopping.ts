import { supabase } from '../supabase';
import type { ShoppingItem, ShoppingList } from '../types';
import { useAuthedQuery } from './query';

export const useLists = () =>
  useAuthedQuery<ShoppingList[]>(['shopping', 'lists'], () =>
    supabase.from('shopping_lists').select('*').order('created_at'),
  );

export const useItems = () =>
  useAuthedQuery<ShoppingItem[]>(['shopping', 'items'], () =>
    supabase.from('shopping_items').select('*').order('created_at'),
  );
