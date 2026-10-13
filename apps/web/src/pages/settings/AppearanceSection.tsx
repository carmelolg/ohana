import { ACCENTS, ACCENT_HUE, PALETTES, PALETTE_COLORS, PALETTE_LABEL, type Palette } from '@ohana/shared';
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
    applyTheme(theme, profile.accent, profile.palette);
    await patch({ theme });
  };
  const setAccent = async (accent: string) => {
    applyTheme(profile.theme, accent, profile.palette);
    await patch({ accent });
  };
  const setPalette = async (palette: Palette) => {
    applyTheme(profile.theme, profile.accent, palette);
    await patch({ palette });
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
      <div className="set-row set-row-stack">
        <span>Palette</span>
        <div className="palettes" role="group" aria-label="Palette">
          {PALETTES.map((p) => {
            const light = PALETTE_COLORS[p].light;
            return (
              <button
                key={p}
                className="palette-option"
                aria-pressed={profile.palette === p}
                onClick={() => setPalette(p)}
              >
                <span
                  className="palette-swatch"
                  aria-hidden="true"
                  style={{
                    ['--pbg' as string]: light.bg,
                    ['--psurf' as string]: light.surface,
                    ['--ptext' as string]: light.text,
                  }}
                />
                <span>{PALETTE_LABEL[p]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </SettingsCard>
  );
}
