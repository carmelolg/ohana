import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth';

type SupabaseResult = PromiseLike<{ data: unknown; error: { message: string } | null }>;

/**
 * Lettura da Supabase con React Query: parte solo con una sessione attiva e trasforma l'errore del client in un `Error`.
 * Ogni lettura dell'app passa da qui, così cache, offline e gestione errori restano uniformi.
 */
export function useAuthedQuery<T>(
  queryKey: readonly unknown[],
  fetcher: () => SupabaseResult,
  enabled = true,
) {
  const { session } = useAuth();
  return useQuery({
    queryKey,
    enabled: !!session && enabled,
    queryFn: async () => {
      const { data, error } = await fetcher();
      if (error) {
        throw new Error(error.message);
      }
      return data as T;
    },
  });
}
