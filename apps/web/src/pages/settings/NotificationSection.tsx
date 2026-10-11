import { Switch } from '../../components/Switch';
import { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { currentEndpoint, disablePush, enablePush, isIOS, isStandalone, pushSupported } from '../../lib/push';
import { useToast } from '../../lib/toast';
import type { Profile } from '../../lib/types';
import { useProfileUpdate } from './useProfileUpdate';

const REMINDER_CHOICES: [minutes: number, label: string][] = [
  [0, 'All’ora'],
  [60, '1 ora prima'],
  [1440, '1 giorno prima'],
  [2880, '2 giorni prima'],
  [10080, '1 settimana prima'],
];

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="kv">
      <span>{label}</span>
      <Switch label={label} checked={checked} onChange={onChange} />
    </div>
  );
}

/** Iscrizione push di questo dispositivo. */
function usePushToggle() {
  const { session } = useAuth();
  const toast = useToast();
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    void currentEndpoint().then((endpoint) => setEnabled(!!endpoint));
  }, []);
  async function toggle() {
    try {
      if (enabled) {
        await disablePush();
      } else {
        await enablePush(session!.user.id);
      }
      setEnabled(!enabled);
    } catch (e) {
      toast((e as Error).message);
    }
  }
  return { enabled, toggle };
}

function PushRow() {
  const push = usePushToggle();
  if (!pushSupported()) {
    return (
      <div className="kv">
        <span>Push</span>
        <span className="muted">Non supportate da questo browser</span>
      </div>
    );
  }
  if (isIOS() && !isStandalone()) {
    return (
      <div className="banner warn" style={{ marginTop: 10 }}>
        Su iPhone le notifiche push funzionano solo con l’app installata: tocca <b>Condividi</b> e poi{' '}
        <b>Aggiungi a Home</b>, quindi riapri Ohana da lì.
      </div>
    );
  }
  return <ToggleRow label="Push su questo dispositivo" checked={push.enabled} onChange={push.toggle} />;
}

/** Promemoria predefinito, canali di notifica e riepiloghi. */
export function NotificationSection({ profile }: { profile: Profile }) {
  const patch = useProfileUpdate();
  return (
    <>
      <div className="label section-label">Notifiche</div>
      <div className="group">
        <label className="kv">
          <span>Promemoria predefinito</span>
          <select
            className="inline-select"
            aria-label="Promemoria predefinito"
            value={profile.default_reminder_minutes}
            onChange={(e) => patch({ default_reminder_minutes: Number(e.target.value) })}
          >
            {REMINDER_CHOICES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <ToggleRow
          label="Email"
          checked={profile.notify_email}
          onChange={(notify_email) => patch({ notify_email })}
        />
        <ToggleRow
          label={`Brief del mattino ${profile.morning_brief_time.slice(0, 5)}`}
          checked={profile.morning_brief}
          onChange={(morning_brief) => patch({ morning_brief })}
        />
        <ToggleRow
          label="Riepilogo faccende alle 8:00 (push)"
          checked={profile.notify_chores_push}
          onChange={(notify_chores_push) => patch({ notify_chores_push })}
        />
        <PushRow />
      </div>

      <div className="label section-label">Scansione documenti</div>
      <div className="group">
        <ToggleRow
          label="Migliora la lettura con AI"
          checked={profile.scan_llm_fallback}
          onChange={(scan_llm_fallback) => patch({ scan_llm_fallback })}
        />
      </div>
      <p className="muted" style={{ fontSize: 13 }}>
        Disattivato per impostazione predefinita. La lettura avviene sempre sul tuo dispositivo; se attivi
        questa opzione e un campo non viene letto, puoi scegliere di inviare <b>solo il testo</b> (mai la
        foto) a un servizio AI tramite il server di Ohana.
      </p>
    </>
  );
}
