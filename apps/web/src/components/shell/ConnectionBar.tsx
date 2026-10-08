import { useOnlineStatus } from '../../lib/useOnlineStatus';
import { useOutboxCount } from '../../lib/useOutboxCount';

/** Avviso di rete: offline, oppure modifiche in coda in attesa di sincronizzazione. */
export function ConnectionBar() {
  const online = useOnlineStatus();
  const pending = useOutboxCount();
  if (!online) {
    return (
      <div className="offline-bar" role="status">
        Sei offline · le modifiche vengono salvate e inviate al ritorno della rete
      </div>
    );
  }
  return pending > 0 ? (
    <div className="offline-bar" role="status">
      Sincronizzazione di {pending} modifiche…
    </div>
  ) : null;
}
