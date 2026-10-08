import { supabase } from '../supabase';
import type { Category, Contact } from '../types';
import { useAuthedQuery } from './query';

export const useCategories = () =>
  useAuthedQuery<Category[]>(['categories'], () =>
    supabase.from('categories').select('*').order('position').order('name'),
  );

export const useContacts = () =>
  useAuthedQuery<Contact[]>(['contacts'], () => supabase.from('contacts').select('*').order('name'));
