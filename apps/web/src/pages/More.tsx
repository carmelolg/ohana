import { Link } from 'react-router-dom';
import { daysUntil, formatEuro } from '@ohana/shared';
import { netBalancesIn } from '../lib/balances';
import { useAuth } from '../lib/auth';
import {
  nextDue,
  noteActive,
  useBoardNotes,
  useDocuments,
  useExpenses,
  useFeatures,
  useMaintenances,
  useProcedures,
  useSettlements,
  useSpace,
} from '../lib/data';
import type { DocumentRow, Maintenance, Procedure } from '../lib/types';
import { CareCard } from '../components/care/CareCard';

const DAY_MONTH = new Intl.DateTimeFormat('it-IT', {
  timeZone: 'Europe/Rome',
  day: 'numeric',
  month: 'short',
});

function Card({
  to,
  title,
  sub,
  state,
  danger,
}: {
  to: string;
  title: string;
  sub: string;
  state?: string;
  danger?: boolean;
}) {
  return (
    <Link to={to} className="more-card" aria-label={`${title}${state ? ', ' + state : ''}`}>
      <span style={{ fontSize: 16, fontWeight: 600, color: danger ? 'var(--danger-strong)' : undefined }}>
        {title}
      </span>
      <span className="muted" style={{ fontSize: 13, lineHeight: 1.35 }}>
        {sub}
      </span>
      {state && (
        <span
          className="mono"
          style={{ marginTop: 'auto', fontSize: 11, color: 'var(--accent-ink)', textTransform: 'uppercase' }}
        >
          {state}
        </span>
      )}
    </Link>
  );
}

interface StatusInput {
  procedures: Procedure[];
  maintenances: Maintenance[];
  documents: DocumentRow[];
}

const EXPIRY_WINDOW_DAYS = 30;

/** Lo stato riassunto mostrato su ogni card di Altro. */
export function moreStatus(input: StatusInput, inScope: (spaceId: string) => boolean, now: Date) {
  const open = input.procedures.filter((p) => p.status === 'in_corso' && inScope(p.space_id));
  const dues = input.maintenances
    .filter((m) => inScope(m.space_id))
    .map((m) => nextDue(m))
    .filter((d): d is Date => !!d)
    .sort((a, b) => +a - +b);
  const soon = dues.filter((d) => daysUntil(d, now) <= EXPIRY_WINDOW_DAYS);
  const expiring = input.documents.filter((d) => {
    if (!inScope(d.space_id) || !d.expires_at) {
      return false;
    }
    const left = daysUntil(new Date(d.expires_at + 'T09:00:00'), now);
    return left >= 0 && left <= EXPIRY_WINDOW_DAYS;
  });
  return { open, dues, soon, expiring };
}

/** Stato della card Manutenzioni: quante scadono a breve, altrimenti la prossima data. */
export function maintenanceState(soon: number, next: Date | undefined): string | undefined {
  if (soon) {
    return `${soon} tra 30 gg`;
  }
  return next ? `prossima ${DAY_MONTH.format(next)}` : undefined;
}

/** Altro (3c): tutto il resto a un tap, con lo stato già visibile su ogni card. */
export function MorePage() {
  const { session } = useAuth();
  const me = session?.user.id ?? '';
  const { spaces, selected, current } = useSpace();
  const { data: procedures = [] } = useProcedures();
  const { data: maintenances = [] } = useMaintenances();
  const { data: documents = [] } = useDocuments();
  const { data: expenses = [] } = useExpenses();
  const { data: settlements = [] } = useSettlements();
  const isOn = useFeatures();
  useBoardNotes(); // precarica la bacheca per Oggi
  void noteActive;

  const inScope = (id: string) => selected === 'all' || id === selected;
  const now = new Date();

  const { open, dues, soon, expiring } = moreStatus({ procedures, maintenances, documents }, inScope, now);
  const net = netBalancesIn(expenses, settlements, inScope)[me] ?? 0;

  return (
    <>
      <h2 className="page-title" style={{ fontSize: 36 }}>
        Altro
      </h2>
      <div className="more-grid">
        {isOn('pratiche') && (
          <Card
            to="/pratiche"
            title="Pratiche"
            sub="ISEE mamma, rinnovo patente"
            state={open.length ? `${open.length} in corso` : undefined}
          />
        )}
        {isOn('manutenzioni') && (
          <Card
            to="/manutenzioni"
            title="Manutenzioni"
            sub="Caldaia, gomme, condizionatore"
            state={maintenanceState(soon.length, dues[0])}
          />
        )}
        {isOn('cura') && <CareCard />}
        <Card to="/rubrica" title="Rubrica" sub="Medici, idraulico, amministratore" />
        {isOn('spese') && (
          <Card
            to="/spese"
            title="Spese"
            sub={`Saldo ${current ? current.name : 'tutti gli spazi'}`}
            state={
              Math.abs(net) >= 0.005 ? `${net > 0 ? '+ ' : '− '}${formatEuro(Math.abs(net))}` : undefined
            }
          />
        )}
        {isOn('documenti') && (
          <Card
            to="/documenti"
            title="Documenti"
            sub="Referti, bollette, garanzie"
            state={expiring.length ? `${expiring.length} in scadenza` : undefined}
          />
        )}
        <Card to="/emergenza" title="Emergenza" sub="Numeri e info, anche offline" danger />
      </div>
      <div className="more-list">
        <Link to="/impostazioni" className="more-row">
          <span className="muted">Profilo e impostazioni</span>
          <b>›</b>
        </Link>
        <Link
          to={current ? `/spazio/${current.id}` : spaces[0] ? `/spazio/${spaces[0].id}` : '/oggi'}
          className="more-row"
        >
          <span className="muted">Spazi e inviti</span>
          <b>
            {spaces.length} {spaces.length === 1 ? 'spazio' : 'spazi'} ›
          </b>
        </Link>
      </div>
    </>
  );
}
