import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { useCareThreads, useCategories, useContacts, useEvent, useSpace } from '../../lib/data';
import { showFormError } from '../../lib/formError';
import { useBack } from '../../lib/nav';
import { resolveEventValues } from './eventValues';
import { initialReminders, type ReminderDraft } from './reminders';
import { useEventCategory } from './useEventCategory';
import { useEventDraft, type EventDraft } from './useEventDraft';
import { useQuickParse } from './useQuickParse';
import { useSaveEvent } from './useSaveEvent';

const initialTextFrom = (search: URLSearchParams) =>
  [search.get('title'), search.get('text')].filter(Boolean).join(' ');

/** L'importo ha senso per scadenze e visite (ticket), o se è già stato scritto. */
const showsAmount = (isChore: boolean, slug: string | null | undefined, amount: string): boolean =>
  !isChore && (slug === 'scadenza' || slug === 'visita' || !!amount);

interface ToSaveArgs {
  src: ReturnType<typeof useEventSources>;
  draft: EventDraft;
  values: ReturnType<typeof resolveEventValues>;
  title: string;
  reminders: ReminderDraft[];
}

/** Compone ciò che `saveEvent` deve scrivere dalle sorgenti, dalla bozza e dai valori risolti. */
function buildEventToSave({ src, draft, values, title, reminders }: ToSaveArgs) {
  return {
    existing: src.existing,
    userId: src.userId ?? '',
    spaceId: values.spaceId,
    title,
    startsAt: values.startsAt,
    isChore: values.isChore,
    assigneeId: values.assigneeId,
    contactId: values.contactId,
    rrule: values.rrule,
    location: draft.location,
    notes: draft.notes,
    amount: draft.amount,
    reminders,
    checklist: draft.checklist,
    files: draft.files,
    followUpId: src.search.get('followup'),
    careThreadId: draft.careThreadId || null,
  };
}

/** Tutto ciò che la schermata legge: impegno esistente (in modifica), spazi, contatti, categorie, profilo. */
function useEventSources(eventId: string | undefined) {
  const [search] = useSearchParams();
  const { profile, session } = useAuth();
  const spacesCtx = useSpace();
  const { data: existingEvent, isLoading } = useEvent(eventId);
  const { data: contacts = [] } = useContacts();
  const { data: allCategories = [] } = useCategories();
  return {
    search,
    profile,
    userId: session?.user.id,
    ...spacesCtx,
    existing: existingEvent ?? null,
    isLoading,
    contacts,
    allCategories,
  };
}

type Sources = ReturnType<typeof useEventSources>;

/** Interpreta il testo libero e risolve ogni campo (a mano ▸ capito dal testo ▸ predefinito). */
function useResolvedEvent(src: Sources, draft: EventDraft, isNew: boolean) {
  const { search, existing, contacts, allCategories, spaces, defaultSpace, userId } = src;
  const parsed = useQuickParse({
    text: draft.text,
    enabled: isNew,
    spaceOverride: draft.overrides.spaceId,
    defaultSpaceId: defaultSpace?.id,
    spaces,
    contacts,
    categories: allCategories,
  });
  const values = resolveEventValues({
    overrides: draft.overrides,
    parsed,
    existing,
    requestedKind: search.get('tipo'),
    defaultSpaceId: defaultSpace?.id,
    userId,
    now: new Date(),
  });
  const categoriesOfSpace = useMemo(
    () => allCategories.filter((c) => c.space_id === values.spaceId),
    [allCategories, values.spaceId],
  );
  return { parsed, values, categoriesOfSpace, title: isNew ? (parsed?.title ?? '') : draft.text.trim() };
}

/** Un impegno nato da «+ Impegno» in un filone vive nello spazio di quel filone. */
function useSpaceOfRequestedThread(isNew: boolean, threadId: string | null, draft: EventDraft) {
  const { data: threads = [] } = useCareThreads();
  const spaceId = threads.find((t) => t.id === threadId)?.space_id;
  useEffect(() => {
    if (isNew && spaceId && !draft.overrides.spaceId) {
      draft.override('spaceId', spaceId);
    }
    // scatta quando arrivano i filoni
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew, spaceId]);
}

/**
 * Stato e regole della schermata «Nuovo / Modifica impegno»: compone la bozza (`useEventDraft`), l'interpretazione del
 * testo libero, i valori risolti, la categoria e il salvataggio. La schermata si limita a mostrarlo.
 */
export function useEventForm(eventId: string | undefined) {
  const isNew = !eventId;
  const src = useEventSources(eventId);
  const { existing, contacts, spaces, defaultSpace } = src;
  const [error, setError] = useState('');
  const draft = useEventDraft(existing, initialTextFrom(src.search), src.search.get('filone') ?? '');
  const { parsed, values, categoriesOfSpace, title } = useResolvedEvent(src, draft, isNew);
  useSpaceOfRequestedThread(isNew, src.search.get('filone'), draft);
  const { spaceId, isChore } = values;
  const category = useEventCategory({
    isNew,
    parsed,
    spaceId,
    categoriesOfSpace,
    chosenId: draft.overrides.categoryId,
    savedId: existing?.category_id ?? null,
    choose: (id) => draft.override('categoryId', id),
    onError: setError,
  });
  const reminders =
    draft.editedReminders ??
    initialReminders({
      fromText: parsed?.reminderMinutes,
      profileDefault: src.profile?.default_reminder_minutes,
    });
  const { save, busy } = useSaveEvent({
    toSave: buildEventToSave({ src, draft, values, title, reminders }),
    categoriesOfSpace,
    categoryId: category.categoryId,
    settleCategories: category.settled,
    recordFeedback: category.recordFeedback,
    setError: (message) => showFormError(setError, message),
  });
  const space = src.spaceById(spaceId);
  const back = useBack('/oggi');

  return {
    ...draft,
    ...values,
    isNew,
    isLoading: src.isLoading,
    existing,
    writable: src.canWrite(spaceId) || (isNew && !!defaultSpace),
    busy,
    error,
    back,
    parsed,
    spaces,
    space,
    members: space?.space_members ?? [],
    contactsOfSpace: contacts.filter((c) => c.space_id === spaceId),
    categoriesOfSpace,
    canWrite: src.canWrite,
    category,
    reminders,
    showAmount: showsAmount(isChore, category.selected?.slug, draft.amount),
    save,
  };
}

export type EventForm = ReturnType<typeof useEventForm>;
