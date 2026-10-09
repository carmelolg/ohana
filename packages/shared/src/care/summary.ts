import { formatNumericDate, romeParts } from '../dates';
import { doseLabel, scheduleLabel, type DoseMed } from './doses';
import { entryLine, sinceLastVisit, type EntryLike } from './visit';

/** Testo fisso nel PDF e nell'app: Ohana raccoglie informazioni, non dà indicazioni mediche. */
export const MEDICAL_DISCLAIMER =
  'Documento generato da Ohana con i dati inseriti dalla famiglia. Non sostituisce la documentazione clinica ufficiale.';

interface SummaryMed extends DoseMed {
  thread_id: string | null;
  prescriber: string | null;
  notes: string | null;
}

interface SummaryThread {
  id: string;
  title: string;
  specialty: string | null;
  doctor: string | null;
  color_hue: number;
  status: string;
}

export interface SummaryRecipient {
  first_name: string;
  last_name: string;
  birth_date: string | null;
  tax_code: string | null;
  allergies: string[];
  exemptions: { code?: string; label: string }[];
}

export interface SummaryInput {
  recipient: SummaryRecipient;
  thread: SummaryThread;
  threads: SummaryThread[];
  entries: (EntryLike & { entry_date: string })[];
  medications: SummaryMed[];
  visit: { starts_at: string; caregiverName: string | null; caregiverPhone: string | null };
  questions: string[];
  now: Date;
}

export interface SummaryRow {
  date: string;
  text: string;
}

export interface SummaryBlock {
  title: string;
  hue: number;
  rows: SummaryRow[];
}

export interface VisitSummary {
  patientName: string;
  birthLine: string | null;
  taxCode: string | null;
  visitLine: string;
  caregiverLine: string | null;
  exemptions: string[];
  allergies: string[];
  medications: {
    name: string;
    posology: string;
    threadTitle: string | null;
    hue: number | null;
    prescriber: string | null;
  }[];
  main: SummaryBlock & { since: string | null };
  others: SummaryBlock[];
  questions: string[];
  note: string;
}

const shortDate = (iso: string) => formatNumericDate(new Date(iso + 'T09:00:00')).slice(0, 5);

/** Età in anni compiuti, a Roma. */
export function ageOf(birth: string, now: Date): number {
  const [y, m, d] = birth.split('-').map(Number);
  const p = romeParts(now);
  return p.y - y - (p.m < m || (p.m === m && p.d < d) ? 1 : 0);
}

const rows = (items: { entry: EntryLike }[]): SummaryRow[] =>
  items.map(({ entry }) => ({ date: shortDate(entry.entry_date), text: entryLine(entry) }));

/** Tutti i dati del PDF per il medico (4i): il documento si compone solo da questo oggetto. */
export function buildVisitSummary(input: SummaryInput): VisitSummary {
  const { recipient, thread, threads, entries, medications, visit, questions, now } = input;
  const { since, items } = sinceLastVisit(entries, thread.id);
  const hueOf = (id: string | null) => threads.find((t) => t.id === id)?.color_hue ?? null;
  const titleOf = (id: string | null) => threads.find((t) => t.id === id)?.title ?? null;
  const visitDate = new Date(visit.starts_at);
  const lastVisitEntry = entries.find(
    (e) => e.thread_id === thread.id && e.type === 'visita' && e.entry_date === since,
  );
  const own = items.filter((i) => !i.otherThread);
  const otherIds = [...new Set(items.filter((i) => i.otherThread).map((i) => i.entry.thread_id))];

  return {
    patientName: `${recipient.first_name} ${recipient.last_name}`.trim(),
    birthLine: recipient.birth_date
      ? `Nato il ${formatNumericDate(new Date(recipient.birth_date + 'T09:00:00'))} · ${ageOf(recipient.birth_date, now)} anni`
      : null,
    taxCode: recipient.tax_code,
    visitLine: `Visita: ${thread.specialty ?? thread.title}${thread.doctor ? ` · ${thread.doctor}` : ''} · ${formatNumericDate(visitDate)}`,
    caregiverLine: visit.caregiverName
      ? `Accompagna: ${visit.caregiverName}${visit.caregiverPhone ? ` · ${visit.caregiverPhone}` : ''}`
      : null,
    exemptions: recipient.exemptions.map((e) => (e.code ? `Esenzione ${e.code} (${e.label})` : e.label)),
    allergies: recipient.allergies,
    medications: medications
      .filter((m) => m.active)
      .map((m) => ({
        name: `${m.name}${m.strength ? ' ' + m.strength : ''}`,
        posology: `${doseLabel(m)} ${m.notes ? m.notes : scheduleLabel(m.schedule)}`.trim(),
        threadTitle: titleOf(m.thread_id),
        hue: hueOf(m.thread_id),
        prescriber: m.prescriber,
      })),
    main: {
      title: thread.title,
      hue: thread.color_hue,
      since,
      rows: [...rows(own), ...(lastVisitEntry ? rows([{ entry: lastVisitEntry }]) : [])],
    },
    others: otherIds.map((id) => ({
      title: titleOf(id) ?? 'Altro filone',
      hue: hueOf(id) ?? 0,
      rows: rows(items.filter((i) => i.entry.thread_id === id)),
    })),
    questions,
    note: MEDICAL_DISCLAIMER,
  };
}
