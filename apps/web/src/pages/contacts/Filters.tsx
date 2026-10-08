interface Props {
  query: string;
  onQuery: (v: string) => void;
  roles: string[];
  role: string;
  onRole: (v: string) => void;
}

/** Ricerca per nome e chip dei ruoli. */
export function Filters({ query, onQuery, roles, role, onRole }: Props) {
  return (
    <>
      <input
        className="input"
        style={{ marginTop: 14 }}
        type="search"
        placeholder="Cerca per nome"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        aria-label="Cerca contatti"
      />
      {roles.length > 0 && (
        <div className="chips" style={{ padding: '10px 0 0' }} role="group" aria-label="Filtra per ruolo">
          <button className="chip" aria-pressed={role === ''} onClick={() => onRole('')}>
            Tutti
          </button>
          {roles.map((r) => (
            <button key={r} className="chip" aria-pressed={role === r} onClick={() => onRole(r)}>
              {r}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
