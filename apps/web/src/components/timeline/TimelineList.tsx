import { Link } from 'react-router-dom';
import { careColor } from '../../lib/color';
import type { TimelineRow } from '../../lib/timeline';
import { ActionButton } from '../ActionButton';

const DAY_MONTH = new Intl.DateTimeFormat('it-IT', {
  timeZone: 'Europe/Rome',
  day: 'numeric',
  month: 'short',
});
const WITH_YEAR = new Intl.DateTimeFormat('it-IT', {
  timeZone: 'Europe/Rome',
  day: 'numeric',
  month: 'short',
  year: '2-digit',
});

interface Props {
  rows: TimelineRow[];
  /** Tonalità della linea (filone di cura, colore dello spazio…). */
  hue: number;
  /** Anno corrente: gli anni diversi compaiono nella data. */
  year: number;
  /** Mostra solo le prime righe (colonna del desktop). */
  limit?: number;
}

function dateLabel(row: TimelineRow, year: number): string {
  if (!row.dated) {
    return '';
  }
  const date = new Date(row.at);
  return (date.getFullYear() === year ? DAY_MONTH : WITH_YEAR).format(date);
}

function Row({ row, hue, year, last }: { row: TimelineRow; hue: number; year: number; last: boolean }) {
  const nodeClass = 'tl-node' + (row.planned ? ' planned' : row.filled ? ' filled' : '');
  return (
    <div
      className={'tl-row' + (row.planned ? ' planned' : '')}
      style={{ ['--thread' as string]: careColor(hue) }}
    >
      <div className="tl-date">{dateLabel(row, year)}</div>
      <div className="tl-rail">
        <div className={nodeClass} />
        {!last && <div className="tl-line" />}
      </div>
      <div className="tl-body">
        <span className="tl-type">{row.type}</span>
        {row.href ? (
          <Link className="tl-title" to={row.href}>
            {row.title}
          </Link>
        ) : (
          <span className="tl-title">{row.title}</span>
        )}
        {row.text && <span className="tl-text">{row.text}</span>}
        {row.facts && row.facts.length > 0 && (
          <ul className="tl-facts">
            {row.facts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        )}
        {(row.chips.length > 0 || row.action) && (
          <div className="tl-chips">
            {row.chips.map((chip) => (
              <ActionButton key={chip.id} className="file-chip" onAction={chip.onOpen}>
                {chip.label}
              </ActionButton>
            ))}
            {row.action && (
              <button
                type="button"
                className="file-chip add"
                aria-label={row.action.ariaLabel}
                onClick={row.action.onClick}
              >
                {row.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Linea del tempo verticale: righe già pronte (`lib/timeline.ts`), la stessa per Cura, Manutenzioni e Pratiche. */
export function TimelineList({ rows, limit, hue, year }: Props) {
  const shown = limit ? rows.slice(0, limit) : rows;
  return (
    <div className="timeline">
      {shown.map((row, i) => (
        <Row key={row.id} row={row} hue={hue} year={year} last={i === shown.length - 1} />
      ))}
    </div>
  );
}
