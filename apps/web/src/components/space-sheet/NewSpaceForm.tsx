import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { SPACE_HUES } from '@ohana/shared';
import { HueSwatches } from '../HueSwatches';
import { createSpace } from '../../lib/api/spaces';
import { useAuth } from '../../lib/auth';
import { useSpace } from '../../lib/data';
import { Sheet } from '../ui';

interface Props {
  onBack: () => void;
  onClose: () => void;
}

/** Form «Nuovo spazio»: nome e colore; a creazione avvenuta lo spazio diventa quello attivo. */
export function NewSpaceForm({ onBack, onClose }: Props) {
  const { setSelected } = useSpace();
  const { session } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [hue, setHue] = useState<number>(SPACE_HUES[0]);
  const [err, setErr] = useState('');

  async function create() {
    if (!name.trim()) {
      return;
    }
    const id = crypto.randomUUID();
    try {
      await createSpace({ id, name: name.trim(), colorHue: hue, createdBy: session!.user.id });
    } catch (e) {
      return setErr((e as Error).message);
    }
    await qc.invalidateQueries({ queryKey: ['spaces'] });
    await qc.invalidateQueries({ queryKey: ['categories'] });
    setSelected(id);
    onClose();
  }

  return (
    <Sheet onClose={onClose} label="Nuovo spazio">
      <div className="stack" style={{ padding: '0 4px' }}>
        <h3 style={{ fontSize: 20 }}>Nuovo spazio</h3>
        <input
          className="input"
          autoFocus
          placeholder="Nome (es. Casa mia)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Nome dello spazio"
        />
        <div className="label">Colore</div>
        <HueSwatches value={hue} onChange={setHue} labelPrefix="Tonalità" />
        {err && <p className="error">{err}</p>}
        <div className="hstack">
          <button className="btn ghost" style={{ flex: 1 }} onClick={onBack}>
            Indietro
          </button>
          <button className="btn" style={{ flex: 1 }} onClick={create} disabled={!name.trim()}>
            Crea
          </button>
        </div>
      </div>
    </Sheet>
  );
}
