import { useEffect, useState } from 'react';
import type { LocationValue } from '../../components/LocationField';
import type { ChecklistItem, EventRow } from '../../lib/types';
import type { Overrides } from './eventValues';
import { remindersFromEvent, type ReminderDraft } from './reminders';

const NO_LOCATION: LocationValue = { text: '', lat: null, lng: null };

/** Valori iniziali della bozza quando si modifica un impegno già salvato. */
export function draftFromEvent(e: EventRow) {
  return {
    text: e.title,
    overrides: {
      spaceId: e.space_id,
      startsAt: new Date(e.starts_at),
      categoryId: e.category_id,
      contactId: e.contact_id,
      assigneeId: e.assignee_id,
      rrule: e.rrule ?? '',
    } satisfies Overrides,
    location: { text: e.location ?? '', lat: e.location_lat, lng: e.location_lng },
    notes: e.notes ?? '',
    amount: e.amount != null ? String(e.amount) : '',
    reminders: remindersFromEvent(e.event_reminders),
    checklist: [...e.event_checklist_items].sort((a, b) => a.position - b.position),
  };
}

/**
 * Bozza dell'impegno in modifica: tutti i campi che l'utente può toccare, più le aperture opzionali (luogo, checklist).
 * Non conosce regole né salvataggio: quelle stanno in `useEventForm`.
 */
export function useEventDraft(existing: EventRow | null, initialText: string, initialCareThread = '') {
  const [text, setText] = useState(initialText);
  const [overrides, setOverrides] = useState<Overrides>({});
  const [location, setLocation] = useState<LocationValue>(NO_LOCATION);
  const [showLocation, setShowLocation] = useState(false);
  const [notes, setNotes] = useState('');
  const [amount, setAmount] = useState('');
  const [editedReminders, setEditedReminders] = useState<ReminderDraft[] | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [showChecklist, setShowChecklist] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  /** Filone di cura (vuoto = nessuno): può arrivare già scelto dall'indirizzo, aprendo «+ Impegno» da un filone. */
  const [careThreadId, setCareThreadId] = useState(initialCareThread);

  // carica l'impegno esistente nello stato di modifica
  useEffect(() => {
    if (!existing) {
      return;
    }
    const d = draftFromEvent(existing);
    setText(d.text);
    setOverrides(d.overrides);
    setLocation(d.location);
    setShowLocation(!!existing.location);
    setNotes(d.notes);
    setAmount(d.amount);
    setEditedReminders(d.reminders);
    setChecklist(d.checklist);
    setShowChecklist(d.checklist.length > 0);
    setCareThreadId(existing.care_thread_id ?? '');
  }, [existing]);

  return {
    text,
    setText,
    overrides,
    override: <K extends keyof Overrides>(key: K, value: Overrides[K]) =>
      setOverrides((o) => ({ ...o, [key]: value })),
    location,
    setLocation,
    showLocation,
    openLocation: () => setShowLocation(true),
    notes,
    setNotes,
    amount,
    setAmount,
    editedReminders,
    setReminders: setEditedReminders,
    checklist,
    setChecklist,
    showChecklist,
    openChecklist: () => setShowChecklist(true),
    careThreadId,
    setCareThreadId,
    files,
    addFiles: (added: File[]) => setFiles((l) => [...l, ...added]),
    removeFile: (index: number) => setFiles((l) => l.filter((_, j) => j !== index)),
  };
}

export type EventDraft = ReturnType<typeof useEventDraft>;
