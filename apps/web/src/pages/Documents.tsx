import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Upload } from 'lucide-react';
import { BackLink } from '../components/BackLink';
import { useDocuments, useMutate, useSpace } from '../lib/data';
import { useDialog } from '../lib/dialog';
import { useToast } from '../lib/toast';
import type { DocumentRow } from '../lib/types';
import { DocumentRowButton } from './documents/DocumentRowButton';
import { DocumentSheet } from './documents/DocumentSheet';
import { UploadSheet } from './documents/UploadSheet';
import { deleteDocument, renameDocument } from './documents/documentCommands';
import { foldersOf } from './documents/listing';

function AddButtons({ onFile }: { onFile: (f: File | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="hstack" style={{ marginTop: 14, flexWrap: 'wrap' }}>
      <Link to="/scansiona" className="btn small">
        <Camera size={16} /> Scansiona
      </Link>
      <button className="btn ghost small" onClick={() => input.current?.click()}>
        <Upload size={16} /> Carica file
      </button>
      <input
        ref={input}
        type="file"
        hidden
        aria-label="Carica un file"
        accept="image/*,application/pdf"
        onChange={(e) => {
          onFile(e.target.files?.[0] ?? null);
          e.target.value = '';
        }}
      />
    </div>
  );
}

/** Documenti: archivio per cartelle di referti, bollette, garanzie… con scadenza opzionale. */
export default function DocumentsPage() {
  const { selected, spaceById, canWrite, defaultSpace } = useSpace();
  const { data: docs = [] } = useDocuments();
  const mutate = useMutate();
  const dialog = useDialog();
  const toast = useToast();
  const [open, setOpen] = useState<DocumentRow | null>(null);
  const [upload, setUpload] = useState<File | null>(null);
  const now = useMemo(() => new Date(), []);
  const writable = canWrite(selected === 'all' ? defaultSpace?.id : selected);
  const scoped = docs.filter((d) => selected === 'all' || d.space_id === selected);
  // il foglio legge la riga dalla lista: dopo una rinomina mostra il nome nuovo
  const current = open ? (docs.find((d) => d.id === open.id) ?? open) : null;

  async function remove(d: DocumentRow) {
    const confirmed = await dialog.confirm({
      title: `Eliminare «${d.title || 'documento'}»?`,
      message: 'Il file viene eliminato per tutti i membri dello spazio.',
      confirmLabel: 'Elimina',
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    await deleteDocument(mutate, d);
    setOpen(null);
    toast('Documento eliminato');
  }

  return (
    <>
      <BackLink to="/casa" label="Casa" />
      <h2 className="page-title" style={{ fontSize: 36 }}>
        Documenti
      </h2>
      {writable && <AddButtons onFile={setUpload} />}
      {foldersOf(scoped).map((f) => (
        <section key={f} aria-label={f}>
          <div className="label section-label">{f}</div>
          {scoped
            .filter((d) => d.folder === f)
            .map((d) => (
              <DocumentRowButton
                key={d.id}
                doc={d}
                space={spaceById(d.space_id)}
                showSpaceDot={selected === 'all'}
                now={now}
                onOpen={() => setOpen(d)}
              />
            ))}
        </section>
      ))}
      {scoped.length === 0 && (
        <div className="empty">
          Ancora nessun documento.
          <br />
          Scansiona una bolletta o carica un referto: li ritrovi qui per cartella.
        </div>
      )}
      {current && (
        <DocumentSheet
          doc={current}
          canDelete={canWrite(current.space_id)}
          onRename={
            canWrite(current.space_id) ? (title) => void renameDocument(mutate, current, title) : undefined
          }
          onDelete={() => void remove(current)}
          onClose={() => setOpen(null)}
        />
      )}
      {upload && <UploadSheet file={upload} onClose={() => setUpload(null)} />}
    </>
  );
}
