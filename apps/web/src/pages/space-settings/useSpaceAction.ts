import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../lib/toast';

/** Esegue un'azione sullo spazio: se riesce ricarica gli spazi, se fallisce mostra l'errore. Restituisce `true` se è riuscita. */
export function useSpaceAction() {
  const toast = useToast();
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ['spaces'] });
  async function run(
    action: () => Promise<void>,
    options: { refresh?: boolean } = { refresh: true },
  ): Promise<boolean> {
    try {
      await action();
      if (options.refresh) {
        void refresh();
      }
      return true;
    } catch (e) {
      toast((e as Error).message);
      return false;
    }
  }
  return { run, refresh };
}
