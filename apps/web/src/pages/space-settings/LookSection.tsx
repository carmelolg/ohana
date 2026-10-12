import { useState } from 'react';
import { SPACE_HUES } from '@ohana/shared';
import { updateSpace } from '../../lib/api/spaces';
import { spaceColor } from '../../lib/color';
import { SettingsCard } from '../../components/SettingsCard';
import type { Space } from '../../lib/types';
import { useSpaceAction } from './useSpaceAction';

/** Nome e colore dello spazio (solo per proprietari e amministratori). */
export function LookSection({ space }: { space: Space }) {
  const { run } = useSpaceAction();
  const [name, setName] = useState(space.name);
  const update = (changes: Parameters<typeof updateSpace>[1]) => run(() => updateSpace(space.id, changes));
  return (
    <SettingsCard
      id="aspetto"
      title="Nome e colore"
      hint="Come si chiama lo spazio e che colore ha per tutti i membri."
    >
      <label className="field set-field">
        <span className="label">Nome</span>
        <input
          className="input"
          aria-label="Nome dello spazio"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() && name !== space.name && update({ name: name.trim() })}
        />
      </label>
      <div className="set-row set-row-stack">
        <span>Colore</span>
        <div className="swatches">
          {SPACE_HUES.map((h) => (
            <button
              key={h}
              className="swatch"
              style={{ ['--c' as string]: spaceColor(h) }}
              aria-pressed={space.color_hue === h}
              aria-label={`Tonalità ${h}`}
              onClick={() => update({ color_hue: h })}
            />
          ))}
        </div>
      </div>
    </SettingsCard>
  );
}
