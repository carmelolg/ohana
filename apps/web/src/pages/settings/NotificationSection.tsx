import { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { currentEndpoint, disablePush, enablePush, isIOS, isStandalone, pushSupported } from '../../lib/push';
import { useToast } from '../../lib/toast';
import type { Profile } from '../../lib/types';
import { SettingsCard } from '../../components/SettingsCard';
import { ToggleRow } from '../../components/ToggleRow';
import { useProfileUpdate } from './useProfileUpdate';

const REMINDER_CHOICES: [minutes: number, label: string][] = [
  [0, 'All’ora'],
  [60, '1 ora prima'],
  [1440, '1 giorno prima'],
  [2880, '2 giorni prima'],
  [10080, '1 settimana prima'],
];

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
      <div className="set-row">
        <div className="set-row-text">
          <span>Push</span>
          <span className="muted set-hint">Non supportate da questo browser</span>
        </div>
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
    <SettingsCard id="notifiche" title="Notifiche" hint="Quando e dove ricevere i promemoria.">
      <label className="set-row">
        <div className="set-row-text">
          <span>Promemoria predefinito</span>
          <span className="muted set-hint">Per i nuovi impegni, quanto prima avvisarti.</span>
        </div>
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
        hint="Promemoria e riepiloghi anche via email."
        checked={profile.notify_email}
        onChange={(notify_email) => patch({ notify_email })}
      />
      <ToggleRow
        label={`Brief del mattino ${profile.morning_brief_time.slice(0, 5)}`}
        hint="Cosa c'è oggi, ogni mattina. Sostituisce le email dei singoli promemoria; le push restano."
        checked={profile.morning_brief}
        onChange={(morning_brief) => patch({ morning_brief })}
      />
      <ToggleRow
        label="Riepilogo faccende alle 8:00 (push)"
        checked={profile.notify_chores_push}
        onChange={(notify_chores_push) => patch({ notify_chores_push })}
      />
      <PushRow />
    </SettingsCard>
  );
}
