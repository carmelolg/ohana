import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSpace } from '../../lib/data';
import { settingsRedirect } from './settingsRedirect';

/**
 * Il selettore di spazio cambia solo lo spazio selezionato, non l'URL: senza questo la pagina resterebbe sullo
 * spazio aperto per primo. Si muove solo quando la selezione *cambia*, non all'apertura: dall'elenco in Impostazioni
 * si può entrare nelle impostazioni di uno spazio diverso da quello selezionato.
 */
export function useFollowSelectedSpace(currentId: string): void {
  const { selected } = useSpace();
  const nav = useNavigate();
  const previous = useRef(selected);

  useEffect(() => {
    if (previous.current === selected) {
      return;
    }
    previous.current = selected;
    const target = settingsRedirect(selected, currentId);
    if (target) {
      nav(target, { replace: true });
    }
  }, [selected, currentId, nav]);
}
