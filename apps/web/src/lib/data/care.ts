import { useMemo } from 'react';
import {
  CARE_PARAMS,
  careName,
  careTodayRow,
  isParamKey,
  isoDayRome,
  startOfDayRome,
  type TodayRow,
} from '@ohana/shared';
import { supabase } from '../supabase';
import { useAuth } from '../auth';
import type {
  CareEntry,
  CareFile,
  CareRecipient,
  CareThread,
  Measurement,
  Medication,
  MedicationDose,
  VisitPrep,
} from '../types';
import { useFeatures } from './features';
import { useAuthedQuery } from './query';
import { useSpace } from './spaces';

export const useCareRecipients = () =>
  useAuthedQuery<CareRecipient[]>(['care', 'recipients'], () =>
    supabase.from('care_recipients').select('*').order('created_at'),
  );

export const useCareThreads = () =>
  useAuthedQuery<CareThread[]>(['care', 'threads'], () =>
    supabase.from('care_threads').select('*').order('created_at'),
  );

/** Prossimo passo del diario di una visita, con il filone della visita (`events.care_thread_id`). */
interface VisitStepRow {
  id: string;
  title: string;
  due_date: string | null;
  due_hint: string | null;
  created_event_id: string | null;
  // relazione incorporata many-to-one: PostgREST la restituisce come oggetto, non come array
  events: { care_thread_id: string };
}

/** Passi del diario di tutte le visite che stanno in un filone: compaiono come prossimi passi del filone. */
export const useCareVisitSteps = () => {
  const query = useAuthedQuery<VisitStepRow[]>(['care', 'visit-steps'], () =>
    supabase
      .from('follow_ups')
      .select('id, title, due_date, due_hint, created_event_id, events!inner(care_thread_id)')
      .not('events.care_thread_id', 'is', null),
  );
  const data = useMemo(
    () =>
      (query.data ?? []).map((row) => ({
        id: row.id,
        title: row.title,
        due_date: row.due_date,
        due_hint: row.due_hint,
        event_id: row.created_event_id,
        thread_id: row.events.care_thread_id,
      })),
    [query.data],
  );
  return { ...query, data };
};

export const useCareEntries = (recipientId: string | undefined) =>
  useAuthedQuery<CareEntry[]>(
    ['care', 'entries', recipientId],
    () =>
      supabase
        .from('care_entries')
        .select('*, care_files(*)')
        .eq('recipient_id', recipientId!)
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false }),
    !!recipientId,
  );

export const useMedications = (enabled = true) =>
  useAuthedQuery<Medication[]>(
    ['care', 'meds'],
    () => supabase.from('medications').select('*').order('name'),
    enabled,
  );

/** Dosi segnate dal giorno indicato (`YYYY-MM-DD`) in poi. */
export const useDoses = (sinceDay: string, enabled = true) =>
  useAuthedQuery<MedicationDose[]>(
    ['care', 'doses', sinceDay],
    () => supabase.from('medication_doses').select('*').gte('day', sinceDay),
    enabled,
  );

const MEASUREMENTS_SHOWN = 400;

export const useMeasurements = (recipientId: string | undefined) =>
  useAuthedQuery<Measurement[]>(
    ['care', 'measures', recipientId],
    () =>
      supabase
        .from('measurements')
        .select('*')
        .eq('recipient_id', recipientId!)
        .order('measured_at', { ascending: false })
        .limit(MEASUREMENTS_SHOWN),
    !!recipientId,
  );

/** Persone che hanno già un parametro registrato da `sinceIso` in poi. */
export const useMeasuredSince = (sinceIso: string, enabled = true) =>
  useAuthedQuery<{ recipient_id: string }[]>(
    ['care', 'measured', sinceIso],
    () => supabase.from('measurements').select('recipient_id').gte('measured_at', sinceIso),
    enabled,
  );

export const useVisitPrep = (eventId: string | undefined) =>
  useAuthedQuery<VisitPrep | null>(
    ['care', 'prep', eventId],
    () => supabase.from('visit_prep').select('*, visit_questions(*)').eq('event_id', eventId!).maybeSingle(),
    !!eventId,
  );

export interface CareReminderEvent {
  id: string;
  title: string;
  medication_id: string | null;
  care_thread_id: string | null;
  status: 'open' | 'done';
  starts_at: string;
  /** Categoria dell'impegno: distingue una visita (si chiude con l'esito) da un esame. */
  categories: { slug: string } | null;
  /** Allegati dell'impegno (referti, documenti): la RLS li nasconde al `care_viewer`. */
  attachments: { id: string; path: string; name: string; created_at: string }[];
}

/** Impegni collegati a una terapia o a un filone (ricette da chiedere, piani in scadenza, visite). */
export const useCareEvents = () =>
  useAuthedQuery<CareReminderEvent[]>(['care', 'events'], () =>
    supabase
      .from('events')
      .select(
        'id, title, medication_id, care_thread_id, status, starts_at, categories(slug), attachments(id, path, name, created_at)',
      )
      .or('medication_id.not.is.null,care_thread_id.not.is.null'),
  );

const paramChip = (key: string) => (isParamKey(key) ? CARE_PARAMS[key].chip : key);

/** Persone assistite della vista corrente, se la funzione Cura è accesa. */
export function useScopedRecipients(): CareRecipient[] {
  const { selected } = useSpace();
  const isOn = useFeatures();
  const { data = [] } = useCareRecipients();
  return useMemo(
    () => (isOn('cura') ? data.filter((r) => selected === 'all' || r.space_id === selected) : []),
    [data, selected, isOn],
  );
}

/** Le righe di cura di Oggi (4g): una per persona che seguo, solo se c'è ancora qualcosa da fare. */
export function useCareTodayRows(): (TodayRow & { recipient: CareRecipient })[] {
  const { session } = useAuth();
  const me = session?.user.id ?? '';
  const mine = useScopedRecipients().filter((r) => r.caregiver_ids.includes(me));
  const enabled = mine.length > 0;
  const now = new Date();
  const day = isoDayRome(now);
  const { data: meds = [] } = useMedications(enabled);
  const { data: doses = [] } = useDoses(day, enabled);
  const { data: threads = [] } = useCareThreads();
  const { data: measured = [] } = useMeasuredSince(startOfDayRome(now).toISOString(), enabled);
  return mine.flatMap((r) => {
    const tracked = [
      ...new Set(threads.filter((t) => t.recipient_id === r.id).flatMap((t) => t.tracked_params)),
    ];
    const row = careTodayRow({
      recipient: r,
      meds: meds.filter((m) => m.recipient_id === r.id),
      taken: doses.filter((d) => meds.some((m) => m.id === d.medication_id && m.recipient_id === r.id)),
      trackedParamLabels: tracked.length ? tracked.map(paramChip) : [],
      measuredToday: measured.some((m) => m.recipient_id === r.id),
      userId: me,
      now,
    });
    return row ? [{ ...row, recipient: r }] : [];
  });
}

const SIGNED_URL_SECONDS = 300;

/** Indirizzo temporaneo di un file sanitario (foto, referto): il bucket è privato, quindi serve sempre firmarlo. */
export const useCareFileUrl = (path: string | null | undefined) =>
  useAuthedQuery<string | null>(
    ['care', 'url', path],
    async () => {
      const { data, error } = await supabase.storage.from('care').createSignedUrl(path!, SIGNED_URL_SECONDS);
      return { data: data?.signedUrl ?? null, error: error ? { message: error.message } : null };
    },
    !!path,
  );

export const useCareFiles = (recipientId: string | undefined) =>
  useAuthedQuery<CareFile[]>(
    ['care', 'files', recipientId],
    () =>
      supabase
        .from('care_files')
        .select('*')
        .eq('recipient_id', recipientId!)
        .order('created_at', { ascending: false }),
    !!recipientId,
  );

/** Per la card di Altro: i nomi delle persone assistite della vista e la data del prossimo controllo. */
export function useCareCard() {
  const people = useScopedRecipients();
  const { data: threads = [] } = useCareThreads();
  const { data: events = [] } = useCareEvents();
  const ids = new Set(threads.filter((t) => people.some((p) => p.id === t.recipient_id)).map((t) => t.id));
  const now = Date.now();
  const next = events
    .filter(
      (e) =>
        e.status === 'open' &&
        e.care_thread_id &&
        ids.has(e.care_thread_id) &&
        new Date(e.starts_at).getTime() >= now,
    )
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];
  return { people, nextCheck: next ? new Date(next.starts_at) : null };
}

/** Il tassello creato chiudendo una visita (se già registrato). */
export const useCareEntryForEvent = (eventId: string | undefined) =>
  useAuthedQuery<Pick<CareEntry, 'id' | 'thread_id' | 'recipient_id' | 'follow_ups'> | null>(
    ['care', 'event-entry', eventId],
    () =>
      supabase
        .from('care_entries')
        .select('id, thread_id, recipient_id, follow_ups')
        .eq('event_id', eventId!)
        .eq('type', 'visita')
        .maybeSingle(),
    !!eventId,
  );

/** Persone assistite di uno spazio in cui la funzione Cura è accesa. */
export function useSpaceRecipients(spaceId: string | undefined): CareRecipient[] {
  const { spaceById } = useSpace();
  const { data = [] } = useCareRecipients();
  const space = spaceId ? spaceById(spaceId) : undefined;
  return space && !space.disabled_features.includes('cura')
    ? data.filter((r) => r.space_id === space.id)
    : [];
}

/** «Papà · Morbo di Crohn»: a chi appartiene la cura di un impegno. `null` se l'impegno non è collegato a una cura. */
export function useCareLabel(threadId: string | null | undefined): string | null {
  const { data: threads = [] } = useCareThreads();
  const { data: people = [] } = useCareRecipients();
  const thread = threadId ? threads.find((t) => t.id === threadId) : undefined;
  const person = thread ? people.find((p) => p.id === thread.recipient_id) : undefined;
  return thread && person ? `${careName(person)} · ${thread.title}` : null;
}
