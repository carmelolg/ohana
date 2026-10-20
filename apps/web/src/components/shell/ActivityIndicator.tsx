import { useEffect, useState } from 'react';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useNetworkBusy } from '../../lib/busy';

/** Dopo quanto tempo la rotellina compare: sotto questa soglia l'operazione è già finita e il lampeggio darebbe fastidio. */
const SHOW_AFTER_MS = 300;

/** Vero dopo `SHOW_AFTER_MS` di attività continua; torna falso appena l'attività finisce. */
function useDelayedFlag(on: boolean): boolean {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!on) {
      return;
    }
    const timer = window.setTimeout(() => setShown(true), SHOW_AFTER_MS);
    return () => {
      window.clearTimeout(timer);
      setShown(false);
    };
  }, [on]);
  return shown;
}

/**
 * Rotellina nella barra in alto: si accende mentre l'app legge dal server, scrive, carica un file o parla con il Worker.
 * È l'unico segnale generale di attività; i pulsanti che aspettano una risposta mostrano anche il proprio stato.
 */
export function ActivityIndicator() {
  const fetching = useIsFetching() > 0;
  const mutating = useIsMutating() > 0;
  const network = useNetworkBusy();
  const visible = useDelayedFlag(fetching || mutating || network);
  if (!visible) {
    return null;
  }
  return (
    <span className="activity-spinner" role="status" aria-label="Operazione in corso">
      <Loader2 size={18} strokeWidth={2} aria-hidden />
    </span>
  );
}
