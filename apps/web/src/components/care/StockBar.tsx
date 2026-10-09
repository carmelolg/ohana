import { stockLabel, stockLevel } from '@ohana/shared';

/** Barra della scorta: si colora quando mancano meno di 7 giorni. */
export function StockBar({ fraction, daysLeft }: { fraction: number; daysLeft: number | null }) {
  const level = stockLevel(daysLeft);
  return (
    <div className={`stock ${level}`}>
      <div className="track" aria-hidden>
        <div className="fill" style={{ ['--fill' as string]: `${Math.round(fraction * 100)}%` }} />
      </div>
      <span>{stockLabel(daysLeft)}</span>
    </div>
  );
}
