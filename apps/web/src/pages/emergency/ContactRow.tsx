const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;

interface Props {
  name: string;
  role: string;
  phone: string;
  /** Il 112: pulsante rosso. */
  emergency?: boolean;
}

/** Un numero utile con il pulsante «Chiama». */
export function ContactRow({ name, role, phone, emergency }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 0',
        borderBottom: '1px solid var(--line)',
      }}
    >
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <span style={{ fontSize: 16, fontWeight: 600 }}>{name}</span>
        <span className="muted" style={{ fontSize: 13 }}>
          {role}
        </span>
      </div>
      {phone && (
        <a
          href={telHref(phone)}
          aria-label={`Chiama ${name}`}
          className="btn small"
          style={
            emergency
              ? { background: 'var(--danger-strong)', color: '#fff' }
              : { background: 'var(--bg)', color: 'var(--text)' }
          }
        >
          Chiama
        </a>
      )}
    </div>
  );
}
