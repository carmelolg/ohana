import { Switch } from '../../components/Switch';
import { useState } from 'react';
import { SPACE_FEATURES, featureOnIn, toggleFeature, type SpaceFeature } from '@ohana/shared';
import { updateSpace } from '../../lib/api/spaces';
import type { Space } from '../../lib/types';
import { useSpaceAction } from './useSpaceAction';

/** Funzioni attive per lo spazio (solo per proprietari e amministratori): spegnere ciò che non serve la toglie dai menu. */
export function FeaturesSection({ space }: { space: Space }) {
  const { run, refresh } = useSpaceAction();
  const [busy, setBusy] = useState(false);
  const disabled = space.disabled_features ?? [];

  // un cambio alla volta: ogni nuovo elenco parte da quello già salvato, altrimenti due tocchi ravvicinati si sovrascrivono
  async function change(key: SpaceFeature, on: boolean) {
    setBusy(true);
    await run(() => updateSpace(space.id, { disabled_features: toggleFeature(disabled, key, on) }), {
      refresh: false,
    });
    await refresh();
    setBusy(false);
  }

  return (
    <>
      <div className="label section-label">Funzioni</div>
      <p className="muted" style={{ fontSize: 14 }}>
        Spegni ciò che in questo spazio non serve: sparisce dai menu. I dati restano e tornano riaccendendo la
        funzione.
      </p>
      <div className="group">
        {SPACE_FEATURES.map(({ key, label, hint }) => (
          <div key={key} className="kv">
            <span style={{ color: 'inherit' }}>
              {label}
              <br />
              <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
                {hint}
              </span>
            </span>
            <Switch
              label={label}
              checked={featureOnIn(space, key)}
              disabled={busy}
              onChange={(on) => void change(key, on)}
            />
          </div>
        ))}
      </div>
    </>
  );
}
