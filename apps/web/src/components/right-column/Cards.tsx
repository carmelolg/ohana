import { Link } from 'react-router-dom';
import { formatDayShort, formatEuro, type Transfer } from '@ohana/shared';
import type { Occurrence, ShoppingItem } from '../../lib/types';

export function DeadlinesCard({ deadlines }: { deadlines: Occurrence[] }) {
  return (
    <section className="card">
      <div className="label" style={{ marginBottom: 8 }}>
        Scadenze
      </div>
      {deadlines.length === 0 && <p className="muted">Nessuna scadenza in arrivo</p>}
      {deadlines.map((o) => (
        <Link
          key={o.key}
          to={`/evento/${o.event.id}`}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 8,
            padding: '8px 0',
            color: 'inherit',
            textDecoration: 'none',
            minHeight: 44,
            alignItems: 'center',
          }}
        >
          <span style={{ fontWeight: 600 }}>{o.event.title}</span>
          <span className="mono muted" style={{ fontSize: 12 }}>
            {formatDayShort(o.at)}
          </span>
        </Link>
      ))}
    </section>
  );
}

export function ShoppingCard({ open }: { open: ShoppingItem[] }) {
  const preview = open
    .slice(0, 4)
    .map((i) => i.text)
    .join(', ');
  return (
    <section className="card">
      <div className="label" style={{ marginBottom: 8 }}>
        Spesa
      </div>
      <p>
        <b>{open.length}</b> {open.length === 1 ? 'voce' : 'voci'} da comprare
      </p>
      <p className="muted" style={{ fontSize: 13 }}>
        {preview}
      </p>
      <Link to="/spesa">Apri la lista</Link>
    </section>
  );
}

interface BalanceProps {
  transfers: Transfer[];
  me: string;
  nameOf: (userId: string) => string;
}

export function BalanceCard({ transfers, me, nameOf }: BalanceProps) {
  return (
    <section className="card">
      <div className="label" style={{ marginBottom: 8 }}>
        Saldo
      </div>
      {transfers.length === 0 && <p className="muted">Tutto in pari</p>}
      {transfers.map((t, i) => (
        <p key={i}>
          {t.from === me ? (
            <>
              Devi <b className="neg">{formatEuro(t.amount)}</b> a {nameOf(t.to)}
            </>
          ) : (
            <>
              {nameOf(t.from)} ti deve <b className="pos">{formatEuro(t.amount)}</b>
            </>
          )}
        </p>
      ))}
      <Link to="/spese">Vai alle spese</Link>
    </section>
  );
}
