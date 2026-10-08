import { addDaysRome, dayDiffRome, formatDay, romeParts } from '@ohana/shared';
import { OccurrenceRow } from '../../components/OccurrenceRow';
import { spaceColor } from '../../lib/color';
import type { Occurrence } from '../../lib/types';
import { groupByDay, MONTH_CELLS } from './range';

const DOW = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
const WEEK_DAYS = 7;

const sameDay = (a: Date, b: Date) => dayDiffRome(a, b) === 0;

function DayRows({ list }: { list: Occurrence[] }) {
  return (
    <>
      {list.map((o) => (
        <OccurrenceRow key={o.key} occ={o} />
      ))}
    </>
  );
}

interface MonthProps {
  from: Date;
  cursor: Date;
  title: string;
  picked: Date | null;
  occ: Occurrence[];
  colorOf: (spaceId: string) => number | undefined;
  onPick: (d: Date) => void;
}

export function MonthView({ from, cursor, title, picked, occ, colorOf, onPick }: MonthProps) {
  const dayList = (d: Date) => occ.filter((o) => sameDay(d, o.at));
  return (
    <>
      <div className="month" role="grid" aria-label={title}>
        {DOW.map((d, i) => (
          <div key={i} className="dow label">
            {d}
          </div>
        ))}
        {Array.from({ length: MONTH_CELLS }, (_, i) => addDaysRome(from, i)).map((d) => {
          const list = dayList(d);
          const classes = [
            'cell',
            romeParts(d).m === romeParts(cursor).m ? '' : 'out',
            sameDay(new Date(), d) ? 'today' : '',
          ];
          return (
            <button
              key={d.getTime()}
              className={classes.filter(Boolean).join(' ')}
              aria-pressed={!!picked && sameDay(picked, d)}
              onClick={() => onPick(d)}
              aria-label={`${formatDay(d)}, ${list.length} impegni`}
            >
              {romeParts(d).d}
              <span className="dots">
                {list.slice(0, 3).map((o) => (
                  <span
                    key={o.key}
                    className="dot"
                    style={{ background: spaceColor(colorOf(o.event.space_id)) }}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>
      {picked && (
        <>
          <div className="label section-label">{formatDay(picked)}</div>
          <DayRows list={dayList(picked)} />
          {dayList(picked).length === 0 && <div className="empty">Nessun impegno</div>}
        </>
      )}
    </>
  );
}

export function WeekView({ from, occ }: { from: Date; occ: Occurrence[] }) {
  return (
    <>
      {Array.from({ length: WEEK_DAYS }, (_, i) => addDaysRome(from, i)).map((d) => {
        const list = occ.filter((o) => sameDay(d, o.at));
        return (
          <div key={d.getTime()}>
            <div className="label section-label">{formatDay(d)}</div>
            <DayRows list={list} />
            {list.length === 0 && (
              <div style={{ borderTop: '1px solid var(--line)', padding: '10px 0' }} className="muted">
                —
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

export function ListView({ occ }: { occ: Occurrence[] }) {
  return (
    <>
      {groupByDay(occ).map(([k, list]) => (
        <div key={k}>
          <div className="label section-label">{formatDay(new Date(k))}</div>
          <DayRows list={list} />
        </div>
      ))}
      {occ.length === 0 && <div className="empty">Nessun impegno in questo periodo</div>}
    </>
  );
}
