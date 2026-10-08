import { BackLink } from '../../components/BackLink';

interface SpaceOption {
  id: string;
  name: string;
}

interface Props {
  spaces: SpaceOption[];
  activeId: string;
  onSpace: (id: string) => void;
  status: string;
  editLabel: string | null;
  onEdit: () => void;
}

const SPACE_LABEL = { fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 } as const;

function SpacePicker({ spaces, activeId, onSpace }: Pick<Props, 'spaces' | 'activeId' | 'onSpace'>) {
  if (spaces.length === 1) {
    return (
      <span className="muted" style={SPACE_LABEL}>
        <span className="dot" />
        {spaces[0].name}
      </span>
    );
  }
  if (spaces.length === 0) {
    return null;
  }
  return (
    <label className="muted" style={SPACE_LABEL}>
      <span className="dot" />
      <select
        className="inline-select plain"
        aria-label="Spazio"
        value={activeId}
        onChange={(e) => onSpace(e.target.value)}
      >
        {spaces.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} ▾
          </option>
        ))}
      </select>
    </label>
  );
}

/** Testata della pagina Emergenza: indietro, modifica, spazio, titolo rosso e stato dei dati. */
export function Header({ spaces, activeId, onSpace, status, editLabel, onEdit }: Props) {
  return (
    <>
      <div className="hstack" style={{ justifyContent: 'space-between' }}>
        <BackLink to="/altro" label="Altro" />
        {editLabel && (
          <button className="btn ghost small" style={{ marginTop: 6 }} onClick={onEdit}>
            {editLabel}
          </button>
        )}
      </div>
      <div style={{ paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <SpacePicker spaces={spaces} activeId={activeId} onSpace={onSpace} />
        <h2 style={{ fontSize: 36, fontWeight: 600, letterSpacing: '-.02em', color: 'var(--danger-strong)' }}>
          Emergenza
        </h2>
        <span className="muted" style={{ fontSize: 13 }} role="status">
          {status}
        </span>
      </div>
    </>
  );
}
