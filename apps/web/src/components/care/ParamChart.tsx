import { formatCareNumber, type WeekBucket } from '@ohana/shared';

const SHORT_DAY = new Intl.DateTimeFormat('it-IT', {
  timeZone: 'Europe/Rome',
  day: 'numeric',
  month: 'short',
});
const MIN_BAR_PERCENT = 6;

/** Medie settimanali a barre; le settimane con un episodio sono nel colore d'allarme. */
export function ParamChart({ weeks, decimals = 0 }: { weeks: WeekBucket[]; decimals?: number }) {
  const max = Math.max(...weeks.map((w) => w.average ?? 0), 1);
  return (
    <div
      className="chart-bars"
      role="img"
      aria-label={weeks
        .map(
          (w) =>
            `${SHORT_DAY.format(w.start)}: ${w.average === null ? 'nessuna misura' : formatCareNumber(w.average, decimals)}${w.episode ? ', con un episodio' : ''}`,
        )
        .join('; ')}
    >
      {weeks.map((w) => (
        <div
          key={w.start.toISOString()}
          className={'chart-bar' + (w.episode ? ' episode' : '') + (w.average === null ? ' empty' : '')}
        >
          <i
            style={{
              ['--h' as string]: `${w.average === null ? 0 : Math.max((w.average / max) * 100, MIN_BAR_PERCENT)}%`,
            }}
          />
          <span>{w.episode ? '●' : '·'}</span>
        </div>
      ))}
    </div>
  );
}
