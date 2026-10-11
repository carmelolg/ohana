import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { startOfDayRome } from '@ohana/shared';
import { toOccurrences, useEvents, useSpace } from '../lib/data';
import { rangeFor, stepCursor, type View } from './calendar/range';
import { ListView, MonthView, WeekView } from './calendar/Views';

const VIEWS: View[] = ['lista', 'settimana', 'mese'];

export function CalendarPage() {
  const { selected, spaceById } = useSpace();
  const [view, setView] = useState<View>('lista');
  const [cursor, setCursor] = useState(() => startOfDayRome(new Date()));
  const [pickedDay, setPickedDay] = useState<Date | null>(null);

  const { from, to, title } = useMemo(() => rangeFor(view, cursor), [view, cursor]);
  const { data: events = [] } = useEvents(from, to);
  const occ = toOccurrences(
    events.filter((e) => e.kind !== 'faccenda'),
    from,
    to,
    selected,
  );

  return (
    <>
      <h2 className="page-title">Agenda</h2>
      <div className="seg" role="group" aria-label="Vista">
        {VIEWS.map((v) => (
          <button
            key={v}
            aria-pressed={view === v}
            onClick={() => setView(v)}
            style={{ textTransform: 'capitalize' }}
          >
            {v}
          </button>
        ))}
      </div>
      <div className="hstack" style={{ justifyContent: 'space-between', marginTop: 12 }}>
        <button
          className="icon-btn"
          aria-label="Precedente"
          onClick={() => setCursor(stepCursor(view, cursor, -1))}
        >
          <ChevronLeft />
        </button>
        <button
          className="label"
          onClick={() => setCursor(startOfDayRome(new Date()))}
          style={{ textTransform: 'capitalize' }}
        >
          {title}
        </button>
        <button
          className="icon-btn"
          aria-label="Successivo"
          onClick={() => setCursor(stepCursor(view, cursor, 1))}
        >
          <ChevronRight />
        </button>
      </div>
      {view === 'mese' && (
        <MonthView
          from={from}
          cursor={cursor}
          title={title}
          picked={pickedDay}
          occ={occ}
          colorOf={(id) => spaceById(id)?.color_hue}
          onPick={setPickedDay}
        />
      )}
      {view === 'settimana' && <WeekView from={from} occ={occ} />}
      {view === 'lista' && <ListView occ={occ} />}
    </>
  );
}
