import { useQueryClient } from '@tanstack/react-query';
import { createCalendarFeed, deleteCalendarFeed, useCalendarFeeds } from '../../lib/api/feeds';
import { useAuth } from '../../lib/auth';
import { WORKER_URL } from '../../lib/config';
import { useSpace } from '../../lib/data';
import { useToast } from '../../lib/toast';

const feedUrl = (token: string) => `${WORKER_URL}/ics/${token}.ics`;
/** Apple Calendario si iscrive con `webcal://`: stessa pagina, ma si apre direttamente nell'app. */
const appleUrl = (token: string) => feedUrl(token).replace(/^https?:\/\//, 'webcal://');

/** Link di calendario in sola lettura per Google/Apple: uno per spazio o uno per tutti. */
export function CalendarFeedsSection() {
  const { session } = useAuth();
  const { spaces } = useSpace();
  const toast = useToast();
  const qc = useQueryClient();
  const userId = session!.user.id;
  const { data: feeds = [] } = useCalendarFeeds(userId);
  const refresh = () => qc.invalidateQueries({ queryKey: ['feeds'] });

  async function add(spaceId: string | null) {
    try {
      await createCalendarFeed(userId, spaceId);
      await refresh();
    } catch (e) {
      toast((e as Error).message);
    }
  }
  async function revoke(id: string) {
    await deleteCalendarFeed(id);
    void refresh();
  }
  function copy(url: string) {
    void navigator.clipboard.writeText(url);
    toast('Link copiato');
  }

  return (
    <>
      <div className="label section-label">Calendario (Google / Apple)</div>
      <p className="muted" style={{ fontSize: 14 }}>
        Mostra gli impegni di Ohana nel tuo calendario. È in sola lettura e si aggiorna da solo (Google ogni
        8-24 ore). Gli impegni di Cura compaiono solo come «Impegno di cura», senza titolo né note.
      </p>
      <p className="muted" style={{ fontSize: 14 }}>
        <b>Google Calendar</b> (dal computer): accanto a «Altri calendari» scegli «Da URL» e incolla il link.{' '}
        <b>Apple Calendario</b>: File › Nuova sottoscrizione calendario, e incolla il link per Apple.
      </p>
      {feeds.map((f) => (
        <div key={f.id} className="kv">
          <span>{f.space_id ? spaces.find((s) => s.id === f.space_id)?.name : 'Tutti gli spazi'}</span>
          <span>
            <button className="btn ghost small" onClick={() => copy(feedUrl(f.token))}>
              Copia link
            </button>
            <button className="btn ghost small" onClick={() => copy(appleUrl(f.token))}>
              Link per Apple
            </button>
            <button className="icon-btn" aria-label="Revoca" onClick={() => revoke(f.id)}>
              ✕
            </button>
          </span>
        </div>
      ))}
      <div className="hstack" style={{ marginTop: 10, flexWrap: 'wrap' }}>
        {!feeds.some((f) => !f.space_id) && (
          <button className="btn ghost small" onClick={() => add(null)}>
            + Tutti gli spazi
          </button>
        )}
        {spaces
          .filter((s) => !feeds.some((f) => f.space_id === s.id))
          .map((s) => (
            <button key={s.id} className="btn ghost small" onClick={() => add(s.id)}>
              + {s.name}
            </button>
          ))}
      </div>
    </>
  );
}
