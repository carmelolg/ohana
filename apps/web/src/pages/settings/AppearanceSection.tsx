import { ACCENTS, ACCENT_HUE } from '@ohana/shared';
import { applyTheme } from '../../lib/auth';
import type { Profile } from '../../lib/types';
import { SettingsCard } from '../../components/SettingsCard';
import { useProfileUpdate } from './useProfileUpdate';

const THEMES: [Profile['theme'], string][] = [
  ['light', 'Chiaro'],
  ['dark', 'Scuro'],
  ['auto', 'Auto'],
];

/** Tema chiaro/scuro e colore d'accento: si applicano subito, poi si salvano. */
export function AppearanceSection({ profile }: { profile: Profile }) {
  const patch = useProfileUpdate();
  const setTheme = async (theme: Profile['theme']) => {
    applyTheme(theme, profile.accent);
    await patch({ theme });
  };
  const setAccent = async (accent: string) => {
    applyTheme(profile.theme, accent);
    await patch({ accent });
  };
  return (
    <SettingsCard id="aspetto" title="Aspetto" hint="Come appare Ohana sui tuoi dispositivi.">
      <div className="set-row set-row-stack">
        <span>Tema</span>
        <div className="seg" role="group" aria-label="Tema">
          {THEMES.map(([value, label]) => (
            <button key={value} aria-pressed={profile.theme === value} onClick={() => setTheme(value)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="set-row set-row-stack">
        <span>Colore d'accento</span>
        <div className="swatches" role="group" aria-label="Colore accento">
          {ACCENTS.map((a) => (
            <button
              key={a}
              className="swatch"
              style={{ ['--c' as string]: `oklch(0.6 0.13 ${ACCENT_HUE[a]})` }}
              aria-pressed={profile.accent === a}
              aria-label={a}
              onClick={() => setAccent(a)}
            />
          ))}
        </div>
      </div>
    </SettingsCard>
  );
}
