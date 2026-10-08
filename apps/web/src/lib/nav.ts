import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * «Indietro» sicuro: torna alla pagina precedente dell'app; se non c'è (link aperto da un'email, da un'altra app
 * o ricaricando la pagina) va a `fallback` invece di uscire da Ohana.
 */
export function useBack(fallback = '/oggi') {
  const nav = useNavigate();
  return useCallback(() => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) {
      nav(-1);
    } else {
      nav(fallback, { replace: true });
    }
  }, [nav, fallback]);
}
