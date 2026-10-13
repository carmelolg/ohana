import { Compass } from 'lucide-react';
import { SettingsCard } from '../../components/SettingsCard';
import { useTourControl } from '../../components/tour/TourContext';

/** Rilancia la guida sull'app quando serve rivederla. */
export function TourSection() {
  const { start } = useTourControl();
  return (
    <SettingsCard id="guida" title="Guida" hint="Un giro delle funzioni principali, sulle schermate vere.">
      <button className="btn ghost set-tour" onClick={start}>
        <Compass size={18} strokeWidth={1.75} aria-hidden /> Rivedi la guida
      </button>
    </SettingsCard>
  );
}
