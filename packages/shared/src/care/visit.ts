import { formatCareNumber, readingInfo } from './params';

export type EntryType = 'visita' | 'esame' | 'terapia' | 'episodio' | 'nota';

export const ENTRY_TYPE_LABEL: Record<EntryType, string> = {
  visita: 'Visita',
  esame: 'Esame',
  terapia: 'Terapia',
  episodio: 'Episodio',
  nota: 'Nota',
};

export interface FollowUpItem {
  title: string;
  due_date?: string | null;
  due_hint?: string | null;
  /** Impegno creato per questo prossimo passo. */
  event_id?: string | null;
}

export interface EntryLike {
  id: string;
  thread_id: string;
  type: EntryType;
  entry_date: string;
  title: string;
  text: string | null;
  readings: Record<string, unknown>;
}

/** Data (`YYYY-MM-DD`) dell'ultima visita registrata nel filone, o `null` se non ce ne sono. */
export function lastVisitDate(entries: EntryLike[], threadId: string): string | null {
  const dates = entries
    .filter((e) => e.thread_id === threadId && e.type === 'visita')
    .map((e) => e.entry_date);
  return dates.length ? dates.reduce((a, b) => (a > b ? a : b)) : null;
}

export interface SinceItem<E extends EntryLike> {
  entry: E;
  /** Il tassello è di un altro filone (marcato «Altro filone»). */
  otherThread: boolean;
}

/**
 * «Da quando l'ha visto»: i tasselli del filone dopo l'ultima visita, più quelli degli altri filoni nello stesso periodo,
 * dal più recente. Il medico deve sapere anche di una crisi o di un cambio di terapia decisi da un altro specialista.
 */
export function sinceLastVisit<E extends EntryLike>(entries: E[], threadId: string) {
  const since = lastVisitDate(entries, threadId);
  const items: SinceItem<E>[] = entries
    .filter((e) => since === null || e.entry_date > since)
    .map((entry) => ({ entry, otherThread: entry.thread_id !== threadId }))
    .sort((a, b) => b.entry.entry_date.localeCompare(a.entry.entry_date));
  return { since, items };
}

/** Riga di testo di un tassello per il riepilogo: «Crisi intestinale, 2 giorni · Scariche 5 al giorno». */
export function entryLine(e: Pick<EntryLike, 'type' | 'title' | 'text' | 'readings'>): string {
  const readings = Object.entries(e.readings)
    .map(([key, value]) => {
      const info = readingInfo(key);
      const text = typeof value === 'number' ? formatCareNumber(value) : String(value);
      return `${info.label} ${text}${info.unit ? ' ' + info.unit : ''}`;
    })
    .join(' · ');
  const head = e.type === 'visita' ? 'Visita' : e.title;
  const body = [e.type === 'visita' ? e.text || e.title : e.text, readings].filter(Boolean).join(' · ');
  return body ? `${head}: ${body}` : head;
}

export interface ThreadLike {
  id: string;
  title: string;
  specialty: string | null;
  doctor: string | null;
  contact_id?: string | null;
}

/**
 * Filone proposto per una visita appena conclusa: quello già collegato all'impegno, poi quello dello stesso medico
 * (per contatto o per nome), poi quello della stessa specialità citata nel titolo. Un solo filone attivo = lui.
 */
export function suggestThread<T extends ThreadLike>(
  threads: T[],
  visit: { care_thread_id?: string | null; contact_id?: string | null; title: string },
  contactName: string | null,
  normalize: (s: string) => string,
): T | null {
  const linked = threads.find((t) => t.id === visit.care_thread_id);
  if (linked) {
    return linked;
  }
  const byContact = visit.contact_id ? threads.find((t) => t.contact_id === visit.contact_id) : undefined;
  const name = contactName ? normalize(contactName) : '';
  const byName = name ? threads.find((t) => t.doctor && normalize(t.doctor).includes(name)) : undefined;
  const title = normalize(visit.title);
  const bySpecialty = threads.find((t) => {
    const stem = t.specialty ? normalize(t.specialty).slice(0, 6) : '';
    return stem.length >= 4 && title.includes(stem);
  });
  return byContact ?? byName ?? bySpecialty ?? (threads.length === 1 ? threads[0] : null);
}

export interface TherapyChange {
  name: string;
  from: { strength: string | null; doseUnits: number; unit: string };
  to: { strength: string | null; doseUnits: number; unit: string };
}

const posology = (x: TherapyChange['from']) =>
  x.strength ?? `${String(x.doseUnits).replace('.', ',')} ${x.unit}`;

/** Titolo del tassello di una terapia modificata: «Bisoprololo da 1,25 mg a 2,5 mg». */
export function therapyChangeTitle(c: TherapyChange): string {
  const sameStrength = c.from.strength === c.to.strength;
  const [from, to] = sameStrength
    ? [`${c.from.doseUnits} ${c.from.unit}`, `${c.to.doseUnits} ${c.to.unit}`].map((x) => x.replace('.', ','))
    : [posology(c.from), posology(c.to)];
  return `${c.name} da ${from} a ${to}`;
}
