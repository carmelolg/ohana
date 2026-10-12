import type { Profile } from '../../lib/types';
import { SettingsCard } from '../../components/SettingsCard';
import { ToggleRow } from '../../components/ToggleRow';
import { useProfileUpdate } from './useProfileUpdate';

/** Consenso all'uso dell'AI nella scansione dei documenti. */
export function ScanSection({ profile }: { profile: Profile }) {
  const patch = useProfileUpdate();
  return (
    <SettingsCard
      id="privacy"
      title="Scansione documenti"
      hint="La lettura avviene sempre sul tuo dispositivo."
    >
      <ToggleRow
        label="Migliora la lettura con AI"
        hint="Se un campo non viene letto, puoi scegliere di inviare solo il testo (mai la foto) a un servizio AI tramite il server di Ohana. Disattivato per impostazione predefinita."
        checked={profile.scan_llm_fallback}
        onChange={(scan_llm_fallback) => patch({ scan_llm_fallback })}
      />
    </SettingsCard>
  );
}
