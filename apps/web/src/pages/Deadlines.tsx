import { Link } from 'react-router-dom';
import { addDaysRome, formatDayShort, startOfDayRome } from '@ohana/shared';
import { BackLink } from '../components/BackLink';
import { useEventActions } from '../lib/eventActions';
import { groupByMonth } from '../lib/deadlines';
import { useDeadlines, useEvents, useSpace } from '../lib/data';

const HORIZON_DAYS = 365;

/** Scadenze: bollette, bolli, rinnovi, documenti, manutenzioni e pratiche in arrivo, per mese. */
export default function DeadlinesPage() {
  const { canWrite } = useSpace();
  const actions = useEventActions();
  const { deadlines } = useDeadlines(HORIZON_DAYS);
  const { data: events = [] } = useEvents(
    startOfDayRome(new Date()),
    addDaysRome(startOfDayRome(new Date()), HORIZON_DAYS),
  );
  const groups = groupByMonth(deadlines);
  const eventById = new Map(events.map((e) => [e.id, e]));
  return (
    <>
      <BackLink to="/casa" label="Casa" />
      <h2 className="page-title">Scadenze</h2>
      <p className="muted" style={{ fontSize: 14, marginTop: 6 }}>
        Bollette, bolli, rinnovi e documenti in arrivo
      </p>
      {groups.map(([month, list]) => (
        <section key={month}>
          <div className="label section-label" style={{ textTransform: 'capitalize' }}>
            {month}
          </div>
          {list.map((d) => {
            const event = d.eventId ? eventById.get(d.eventId) : undefined;
            return (
              <div key={d.id} className="row" style={{ alignItems: 'center' }}>
                <span className="time">{formatDayShort(d.at).toUpperCase().slice(0, 6)}</span>
                <Link to={d.href} className="body" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <span className="title">{d.title}</span>
                  <span className="meta">{d.sub}</span>
                </Link>
                {event && canWrite(event.space_id) && (
                  <button
                    className="btn ghost small"
                    aria-label={`Segna pagata: ${d.title}`}
                    onClick={() => void actions.done(event)}
                  >
                    Segna pagata
                  </button>
                )}
              </div>
            );
          })}
        </section>
      ))}
      {groups.length === 0 && <div className="empty">Nessuna scadenza in arrivo.</div>}
    </>
  );
}
