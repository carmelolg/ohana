import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useSpace } from '../lib/data';
import { NewSpaceForm } from './space-sheet/NewSpaceForm';
import { SpaceRow } from './space-sheet/SpaceRow';
import { Sheet } from './ui';

/** Elenco degli spazi dell'utente: scelta dello spazio attivo, gestione, creazione e inviti. */
export function SpaceSheet({ onClose }: { onClose: () => void }) {
  const { spaces, selected, setSelected } = useSpace();
  const nav = useNavigate();
  const { session } = useAuth();
  const [creating, setCreating] = useState(false);

  const pick = (id: string) => {
    setSelected(id);
    onClose();
  };
  const manage = (id: string) => {
    onClose();
    nav(`/spazio/${id}`);
  };
  const invite = () => {
    const target = spaces.find((s) => s.id === selected) ?? spaces[0];
    if (target) {
      manage(target.id);
    } else {
      onClose();
    }
  };

  if (creating) {
    return <NewSpaceForm onBack={() => setCreating(false)} onClose={onClose} />;
  }

  return (
    <Sheet onClose={onClose} label="I tuoi spazi">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          padding: '0 4px 8px',
        }}
      >
        <span style={{ fontSize: 20, fontWeight: 600 }}>I tuoi spazi</span>
        <span className="label">{spaces.length} spazi</span>
      </div>
      <button
        className="sheet-row"
        style={{ background: selected === 'all' ? 'var(--bg)' : undefined }}
        onClick={() => pick('all')}
      >
        <span className="dotl" />
        <span style={{ flex: 1 }}>
          <b style={{ fontSize: 16 }}>Tutti gli spazi</b>
          <br />
          <span className="muted" style={{ fontSize: 13 }}>
            Vista unica, solo per te
          </span>
        </span>
      </button>
      {spaces.map((s) => (
        <SpaceRow
          key={s.id}
          space={s}
          me={session?.user.id}
          active={selected === s.id}
          onPick={() => pick(s.id)}
          onManage={() => manage(s.id)}
        />
      ))}
      <div className="hstack" style={{ marginTop: 10 }}>
        <button className="btn" style={{ flex: 1 }} onClick={() => setCreating(true)}>
          + Nuovo spazio
        </button>
        <button className="btn ghost" style={{ flex: 1 }} onClick={invite}>
          Invita persone
        </button>
      </div>
    </Sheet>
  );
}
