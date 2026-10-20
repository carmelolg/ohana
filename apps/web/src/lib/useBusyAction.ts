import { useCallback, useState } from 'react';

/**
 * Stato «in corso» di una singola azione (salvataggio, invio, apertura): mentre dura, chi la usa blocca il pulsante.
 * L'errore non viene inghiottito: `run` lo rilancia, e chi chiama decide cosa mostrare.
 */
export function useBusyAction() {
  const [busy, setBusy] = useState(false);
  const run = useCallback(async <T>(action: () => Promise<T>): Promise<T> => {
    setBusy(true);
    try {
      return await action();
    } finally {
      setBusy(false);
    }
  }, []);
  return { busy, run };
}
