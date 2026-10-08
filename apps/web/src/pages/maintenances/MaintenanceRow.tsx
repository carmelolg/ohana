import { daysUntil, formatEuro, romeParts } from '@ohana/shared';
import { spaceColor } from '../../lib/color';
import type { Maintenance } from '../../lib/types';

const MONTHS_SHORT = ['GEN', 'FEB', 'MAR', 'APR', 'MAG', 'GIU', 'LUG', 'AGO', 'SET', 'OTT', 'NOV', 'DIC'];
const MONTH_YEAR = new Intl.DateTimeFormat('it-IT', {
  timeZone: 'Europe/Rome',
  month: 'short',
  year: 'numeric',
});
const SOON_DAYS = 30;

/** «12 NOV» nell'anno in corso, «NOV 27» in quelli successivi. */
function dueLabel(due: Date, now: Date): string {
  const p = romeParts(due);
  return p.y === romeParts(now).y
    ? `${p.d} ${MONTHS_SHORT[p.m - 1]}`
    : `${MONTHS_SHORT[p.m - 1]} ${String(p.y).slice(2)}`;
}

/** «Ultima nov 2025 · Rossi · 120 €». */
function lastDoneSummary(m: Maintenance, contactName: string | undefined): string {
  const when = m.last_done_at
    ? `Ultima ${MONTH_YEAR.format(new Date(m.last_done_at + 'T09:00:00')).replace('.', '')}`
    : 'Mai fatta';
  const cost = m.last_cost != null ? formatEuro(Number(m.last_cost)).replace(',00', '') : null;
  return [when, contactName, cost].filter(Boolean).join(' · ');
}

interface Props {
  maintenance: Maintenance;
  due: Date | null;
  now: Date;
  contactName: string | undefined;
  spaceHue: number | undefined;
  showSpace: boolean;
  onOpen: () => void;
}

/** Riga di una manutenzione: nome, ultima volta e prossima scadenza (in evidenza se entro 30 giorni). */
export function MaintenanceRow({
  maintenance: m,
  due,
  now,
  contactName,
  spaceHue,
  showSpace,
  onOpen,
}: Props) {
  const soon = due ? daysUntil(due, now) <= SOON_DAYS : false;
  return (
    <button
      className="row"
      style={{ width: '100%', textAlign: 'left', alignItems: 'center' }}
      onClick={onOpen}
      aria-label={`${m.title}, ${due ? dueLabel(due, now) : 'nessuna scadenza'}`}
    >
      <span className="body">
        <span className="title">{m.title}</span>
        <span className="meta">
          {showSpace && <span className="dot" style={{ background: spaceColor(spaceHue) }} />}
          {lastDoneSummary(m, contactName)}
        </span>
      </span>
      {due && (
        <span
          className="mono"
          style={{
            fontSize: 13,
            color: soon ? 'var(--accent-ink)' : 'var(--text-2)',
            fontWeight: soon ? 700 : 500,
            whiteSpace: 'nowrap',
          }}
        >
          {dueLabel(due, now)}
        </span>
      )}
    </button>
  );
}
