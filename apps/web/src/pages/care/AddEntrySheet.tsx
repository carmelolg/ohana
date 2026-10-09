import { useRef, useState } from 'react';
import { isoDayRome } from '@ohana/shared';
import { Field } from '../../components/Field';
import { Sheet } from '../../components/ui';
import { addEntry } from '../../lib/api/care';
import { uploadCareFile } from '../../lib/api/careFiles';
import { useMutate } from '../../lib/data';
import { newId } from '../../lib/outbox';
import { useToast } from '../../lib/toast';
import type { CareThread } from '../../lib/types';

type EntryKind = 'esame' | 'nota';

interface Draft {
  type: EntryKind;
  title: string;
  text: string;
  date: string;
  files: File[];
}

/** Carica gli allegati uno per uno: quelli che non partono (offline) si elencano, senza annullare il tassello già salvato. */
async function uploadAll(thread: CareThread, entryId: string, files: File[]): Promise<string[]> {
  const failed: string[] = [];
  for (const file of files) {
    try {
      await uploadCareFile({ spaceId: thread.space_id, recipientId: thread.recipient_id, entryId, file });
    } catch {
      failed.push(file.name);
    }
  }
  return failed;
}

function useAddEntry(thread: CareThread, onClose: () => void) {
  const mutate = useMutate();
  const toast = useToast();
  const [draft, setDraft] = useState<Draft>({
    type: 'esame',
    title: '',
    text: '',
    date: isoDayRome(new Date()),
    files: [],
  });
  const [busy, setBusy] = useState(false);
  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));

  async function save() {
    setBusy(true);
    const id = newId();
    try {
      await addEntry(mutate, {
        id,
        spaceId: thread.space_id,
        recipientId: thread.recipient_id,
        threadId: thread.id,
        type: draft.type,
        date: draft.date,
        title: draft.title,
        text: draft.text,
      });
      const failed = await uploadAll(thread, id, draft.files);
      toast(failed.length ? `Salvato, ma non ho caricato: ${failed.join(', ')}` : 'Aggiunto al filone');
      onClose();
    } catch {
      toast('Non riesco a salvare il tassello. Riprova.');
      setBusy(false);
    }
  }

  return { draft, patch, busy, save };
}

/** Aggiunge a mano un esame o una nota al filone, con un eventuale referto in allegato. */
export function AddEntrySheet({ thread, onClose }: { thread: CareThread; onClose: () => void }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const { draft, patch, busy, save } = useAddEntry(thread, onClose);
  return (
    <Sheet onClose={onClose} label="Aggiungi al filone">
      <div className="care-form">
        <div className="pill-row" role="group" aria-label="Tipo">
          {(['esame', 'nota'] as const).map((t) => (
            <button
              key={t}
              type="button"
              className="pill"
              aria-pressed={draft.type === t}
              onClick={() => patch({ type: t })}
            >
              {t === 'esame' ? 'Esame' : 'Nota'}
            </button>
          ))}
        </div>
        <Field label="Titolo">
          <input
            className="input"
            value={draft.title}
            onChange={(e) => patch({ title: e.target.value })}
            placeholder="ECG, esami del sangue…"
          />
        </Field>
        <Field label="Data">
          <input
            className="input"
            type="date"
            value={draft.date}
            onChange={(e) => patch({ date: e.target.value })}
          />
        </Field>
        <Field label="Note">
          <textarea
            className="input"
            rows={3}
            value={draft.text}
            onChange={(e) => patch({ text: e.target.value })}
          />
        </Field>
        <button type="button" className="btn ghost small" onClick={() => fileInput.current?.click()}>
          📎 {draft.files.length ? `${draft.files.length} allegati` : 'Allega referto'}
        </button>
        <input
          ref={fileInput}
          type="file"
          hidden
          multiple
          accept="image/*,application/pdf"
          onChange={(e) => patch({ files: Array.from(e.target.files ?? []) })}
        />
        <button
          type="button"
          className="btn accent"
          disabled={busy || !draft.title.trim() || !draft.date}
          onClick={() => void save()}
        >
          Salva
        </button>
      </div>
    </Sheet>
  );
}
