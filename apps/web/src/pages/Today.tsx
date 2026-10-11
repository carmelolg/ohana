import { useMemo } from 'react';
import { addDaysRome, dayDiffRome, formatDayShort, romeParts, startOfDayRome } from '@ohana/shared';
import { toOccurrences, useEventWindow, useSpace } from '../lib/data';
import { OccurrenceRow } from '../components/OccurrenceRow';
import { Link } from 'react-router-dom';
import { BoardBanner } from '../components/BoardBanner';
import { ChoresBlock } from '../components/ChoresBlock';
import { NextCard } from '../components/NextCard';
import { OverdueBanner } from '../components/OverdueBanner';
import { pickNext } from '../lib/nextOccurrence';
import { CareTodayRows } from '../components/care/CareTodayRows';

const WEEKDAY = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', weekday: 'long' });
const BIG = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', day: 'numeric', month: 'long' });

export function TodayPage() {
  const { selected } = useSpace();
  const { data: events = [], isLoading } = useEventWindow();
  const now = new Date();
  const today = startOfDayRome(now);
  const rangeEnd = useMemo(() => addDaysRome(today, 8), [today.getTime()]); // eslint-disable-line react-hooks/exhaustive-deps
  const overdueFrom = addDaysRome(today, -28);

  // le faccende hanno un blocco proprio: non compaiono nella lista degli orari
  const occ = toOccurrences(
    events.filter((e) => e.kind !== 'faccenda'),
    overdueFrom,
    rangeEnd,
    selected,
  );
  const chores = events.filter(
    (e) => e.kind === 'faccenda' && (selected === 'all' || e.space_id === selected),
  );
  const overdue = occ.filter((o) => o.at < today && o.event.status === 'open' && !o.event.rrule);
  const inDay = (n: number) =>
    occ.filter((o) => dayDiffRome(today, o.at) === n && (o.event.status === 'open' || n === 0));
  const todayList = inDay(0);
  const tomorrow = inDay(1);
  const later = occ.filter(
    (o) => dayDiffRome(today, o.at) >= 2 && dayDiffRome(today, o.at) <= 7 && o.event.status === 'open',
  );

  const open = todayList.filter((o) => o.event.status === 'open');
  const dueCount = open.filter((o) => o.event.categories?.slug === 'scadenza').length;
  const parts = [`${open.length - dueCount} ${open.length - dueCount === 1 ? 'impegno' : 'impegni'}`];
  if (dueCount) {
    parts.push(`${dueCount} ${dueCount === 1 ? 'scadenza' : 'scadenze'}`);
  }

  const next = pickNext(open, now);

  return (
    <>
      <BoardBanner />
      <div className="page-head">
        <div className="today-day">{WEEKDAY.format(now)}</div>
        <h1 className="big">{BIG.format(now)}</h1>
        <p className="sub">{open.length ? parts.join(' · ') : 'Niente in programma oggi'}</p>
      </div>

      {next && <NextCard occ={next} now={now} />}
      <CareTodayRows />

      {overdue.map((o) => (
        <OverdueBanner key={o.key} occ={o} />
      ))}

      <div className="list">
        {todayList.map((o) => (
          <OccurrenceRow key={o.key} occ={o} />
        ))}
        {!isLoading && todayList.length === 0 && (
          <div className="empty">
            Giornata libera. <Link to="/nuovo">Aggiungi un impegno</Link>
          </div>
        )}
      </div>

      <ChoresBlock chores={chores} today={now} />

      {tomorrow.length > 0 && (
        <>
          <div className="label section-label">Domani · {formatDayShort(addDaysRome(today, 1))}</div>
          {tomorrow.map((o) => (
            <OccurrenceRow key={o.key} occ={o} />
          ))}
        </>
      )}
      {later.length > 0 && (
        <>
          <div className="label section-label">In arrivo · 7 giorni</div>
          {later.map((o) => (
            <OccurrenceRow
              key={o.key}
              occ={o}
              showDay={`${romeParts(o.at).d} ${new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', month: 'short' }).format(o.at).toUpperCase()}`}
            />
          ))}
        </>
      )}
    </>
  );
}
