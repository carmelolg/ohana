import type { CareTodo, DoseItem, ThreadOverview } from '@ohana/shared';
import { DoseChecklist } from '../../components/care/DoseChecklist';
import { Timeline } from '../../components/care/Timeline';
import { TodoList } from '../../components/care/TodoList';
import { careColor } from '../../lib/color';
import type { CareReminderEvent } from '../../lib/data';
import type { CareEntry, CareThread, Medication } from '../../lib/types';
import { ThreadCard } from './ThreadCards';

const COLUMN_ENTRIES = 4;

interface Props {
  recipientId: string;
  threads: CareThread[];
  overviews: Map<string, ThreadOverview>;
  entries: CareEntry[];
  /** Impegni aperti collegati ai filoni (visite in programma). */
  events: CareReminderEvent[];
  meds: Medication[];
  todayItems: DoseItem<Medication>[];
  todos: CareTodo[];
  authorName: (id: string) => string;
  year: number;
  /** `null` = sola lettura. */
  onToggleDose: ((item: DoseItem<Medication>) => void) | null;
}

/** Terapie senza orario («al bisogno»): non hanno una casella da spuntare. */
function AsNeeded({ meds }: { meds: Medication[] }) {
  const items = meds.filter((m) => m.active && m.schedule.length === 0);
  if (items.length === 0) {
    return null;
  }
  return (
    <p className="muted" style={{ fontSize: 13 }}>
      Al bisogno: {items.map((m) => `${m.name} ${m.strength ?? ''}`.trim()).join(', ')}
    </p>
  );
}

/** Desktop (4h): i filoni affiancati con la loro linea del tempo; a lato terapie di oggi e «Da fare». */
export function DesktopColumns(props: Props) {
  const {
    recipientId,
    threads,
    overviews,
    entries,
    events,
    meds,
    todayItems,
    todos,
    authorName,
    year,
    onToggleDose,
  } = props;
  const tagOf = (med: Medication) => {
    const t = threads.find((x) => x.id === med.thread_id);
    return t ? { hue: t.color_hue, label: t.title.split(' ').slice(-1)[0] } : null;
  };
  return (
    <div className="care-cols">
      <div className="threads">
        {threads.map((t) => (
          <section key={t.id} style={{ ['--thread' as string]: careColor(t.color_hue) }} aria-label={t.title}>
            <ThreadCard recipientId={recipientId} thread={t} overview={overviews.get(t.id)} />
            <Timeline
              entries={entries.filter((e) => e.thread_id === t.id)}
              upcoming={events.filter((e) => e.care_thread_id === t.id && e.status === 'open')}
              hue={t.color_hue}
              authorName={authorName}
              year={year}
              limit={COLUMN_ENTRIES}
            />
          </section>
        ))}
      </div>
      <aside className="side">
        <div className="label">Terapie di oggi</div>
        <DoseChecklist items={todayItems} tagOf={tagOf} onToggle={onToggleDose} />
        <AsNeeded meds={meds} />
        <div className="label">Da fare</div>
        <TodoList todos={todos} to={`/cura/${recipientId}/terapie`} />
      </aside>
    </div>
  );
}
