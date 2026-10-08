import { spaceColor } from '../../lib/color';
import type { DocumentRow, Space } from '../../lib/types';
import { DOC_DATE, docName, expiryBadge } from './listing';

interface Props {
  doc: DocumentRow;
  space: Space | undefined;
  showSpaceDot: boolean;
  now: Date;
  onOpen: () => void;
}

/** Una riga dell'archivio: nome, spazio e data di caricamento, scadenza in mono a destra. */
export function DocumentRowButton({ doc, space, showSpaceDot, now, onOpen }: Props) {
  const badge = expiryBadge(doc, now);
  const meta = [space?.name, DOC_DATE.format(new Date(doc.created_at))].filter(Boolean).join(' · ');
  return (
    <button
      className="row"
      style={{ width: '100%', textAlign: 'left', alignItems: 'center' }}
      onClick={onOpen}
      aria-label={docName(doc)}
    >
      <span className="body">
        <span className="title">{docName(doc)}</span>
        <span className="meta">
          {showSpaceDot && <span className="dot" style={{ background: spaceColor(space?.color_hue) }} />}
          {meta}
        </span>
      </span>
      {badge && (
        <span
          className="mono"
          style={{
            fontSize: 12,
            color: badge.urgent ? 'var(--accent-ink)' : 'var(--text-2)',
            fontWeight: badge.urgent ? 700 : 500,
            whiteSpace: 'nowrap',
          }}
        >
          {badge.text}
        </span>
      )}
    </button>
  );
}
