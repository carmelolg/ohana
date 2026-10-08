import { Link } from 'react-router-dom';
import { Mail, MapPin, Navigation, Phone } from 'lucide-react';
import { formatDate } from '@ohana/shared';
import { spaceColor } from '../../lib/color';
import { osmDirections, osmLink } from '../../lib/geocode';
import type { Contact, EventRow, Space } from '../../lib/types';

interface Props {
  contact: Contact;
  space: Space | undefined;
  showSpace: boolean;
  /** Impegni collegati al contatto, dal più recente. */
  history: EventRow[];
  expanded: boolean;
  canEdit: boolean;
  onToggle: () => void;
  onEdit: () => void;
}

function MapLinks({ contact: c }: { contact: Contact }) {
  const located = c.address_lat != null && c.address_lng != null;
  return (
    <>
      {c.address && (
        <a
          className="btn ghost small"
          target="_blank"
          rel="noreferrer"
          href={
            located
              ? osmLink(c.address_lat!, c.address_lng!)
              : `https://www.openstreetmap.org/search?query=${encodeURIComponent(c.address)}`
          }
        >
          <MapPin size={16} /> Mappa
        </a>
      )}
      {located && (
        <a
          className="btn ghost small"
          target="_blank"
          rel="noreferrer"
          href={osmDirections(c.address_lat!, c.address_lng!)}
        >
          <Navigation size={16} /> Indicazioni
        </a>
      )}
    </>
  );
}

/** Scheda di un contatto: azioni rapide (chiama, email, mappa) e storico degli impegni al tocco. */
export function ContactCard({
  contact: c,
  space,
  showSpace,
  history,
  expanded,
  canEdit,
  onToggle,
  onEdit,
}: Props) {
  return (
    <div style={{ borderTop: '1px solid var(--line)', padding: '14px 0' }}>
      <button
        style={{ width: '100%', textAlign: 'left', minHeight: 44 }}
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <span style={{ fontSize: 17, fontWeight: 600 }}>{c.name}</span>
        <br />
        <span
          className="muted"
          style={{ fontSize: 13, display: 'inline-flex', gap: 6, alignItems: 'center' }}
        >
          {showSpace && <span className="dot" style={{ background: spaceColor(space?.color_hue) }} />}
          {[c.role, showSpace ? space?.name : null].filter(Boolean).join(' · ')}
        </span>
      </button>
      <div className="hstack" style={{ marginTop: 6, flexWrap: 'wrap' }}>
        {c.phone && (
          <a className="btn ghost small" href={`tel:${c.phone}`}>
            <Phone size={16} /> Chiama
          </a>
        )}
        {c.email && (
          <a className="btn ghost small" href={`mailto:${c.email}`}>
            <Mail size={16} /> Email
          </a>
        )}
        <MapLinks contact={c} />
        {canEdit && (
          <button className="btn ghost small" onClick={onEdit}>
            Modifica
          </button>
        )}
      </div>
      {expanded && (
        <div style={{ marginTop: 10 }}>
          {c.address && (
            <p style={{ marginBottom: 8 }}>
              <MapPin size={14} style={{ verticalAlign: '-2px' }} /> {c.address}
            </p>
          )}
          {c.notes && (
            <p className="muted" style={{ marginBottom: 8 }}>
              {c.notes}
            </p>
          )}
          <div className="label">Storico impegni</div>
          {history.length === 0 && <p className="muted">Nessun impegno collegato</p>}
          {history.map((e) => (
            <Link
              key={e.id}
              to={`/evento/${e.id}`}
              className="kv"
              style={{ color: 'inherit', textDecoration: 'none' }}
            >
              <span style={{ color: 'inherit' }}>{e.title}</span>
              <span className="mono muted" style={{ fontSize: 12 }}>
                {formatDate(new Date(e.starts_at))}
                {e.amount ? ` · ${e.amount} €` : ''}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
