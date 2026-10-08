import { useState } from 'react';
import { DOC_FOLDERS } from '@ohana/shared';
import { Sheet } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { useMutate, useSpace } from '../../lib/data';
import { useToast } from '../../lib/toast';
import { uploadDocument } from './documentCommands';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

/** Carica un file nell'archivio: titolo, cartella, spazio e scadenza facoltativa. */
export function UploadSheet({ file, onClose }: { file: File; onClose: () => void }) {
  const { session } = useAuth();
  const { spaces, selected, defaultSpace, canWrite } = useSpace();
  const mutate = useMutate();
  const toast = useToast();
  const [title, setTitle] = useState(file.name.replace(/\.[^.]+$/, ''));
  const [folder, setFolder] = useState('Altro');
  const [expires, setExpires] = useState('');
  const [spaceId, setSpaceId] = useState((selected !== 'all' ? selected : defaultSpace?.id) ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function save() {
    setBusy(true);
    try {
      await uploadDocument(mutate, { file, spaceId, title, folder, expires, userId: session!.user.id });
      toast('Documento salvato');
      onClose();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Sheet onClose={onClose} label="Carica documento">
      <div className="stack">
        <h3 style={{ fontSize: 20 }}>Carica documento</h3>
        <input
          className="input"
          aria-label="Titolo"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Field label="Cartella">
          <select
            className="input"
            aria-label="Cartella"
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
          >
            {DOC_FOLDERS.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </Field>
        {spaces.length > 1 && (
          <select
            className="input"
            aria-label="Spazio"
            value={spaceId}
            onChange={(e) => setSpaceId(e.target.value)}
          >
            {spaces
              .filter((s) => canWrite(s.id))
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
        )}
        <Field label="Scadenza (facoltativa: es. carta d’identità, garanzia)">
          <input
            className="input"
            type="date"
            aria-label="Scadenza"
            value={expires}
            onChange={(e) => setExpires(e.target.value)}
          />
        </Field>
        {err && (
          <p className="error" role="alert">
            {err}
          </p>
        )}
        <div className="hstack">
          <button className="btn ghost" style={{ flex: 1 }} onClick={onClose}>
            Annulla
          </button>
          <button className="btn accent" style={{ flex: 1 }} onClick={save} disabled={busy || !spaceId}>
            Salva
          </button>
        </div>
      </div>
    </Sheet>
  );
}
