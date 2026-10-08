import { useRef, useState } from 'react';
import { Check, Paperclip } from 'lucide-react';
import { useAttachmentsByIds, useMutate } from '../../lib/data';
import { openAttachment, uploadAttachment } from '../../lib/files';
import { useToast } from '../../lib/toast';
import type { Procedure, ProcedureDoc } from '../../lib/types';

/** Documenti richiesti dalla pratica: un tocco apre il file caricato oppure ne carica uno. */
export function DocChips({ procedure: p, writable }: { procedure: Procedure; writable: boolean }) {
  const mutate = useMutate();
  const toast = useToast();
  const { data: attachments = [] } = useAttachmentsByIds(
    p.procedure_docs.map((d) => d.attachment_id).filter((id): id is string => !!id),
  );
  const input = useRef<HTMLInputElement>(null);
  const [target, setTarget] = useState<ProcedureDoc | null>(null);

  async function upload(file: File | undefined) {
    if (!file || !target) {
      return;
    }
    try {
      const saved = await uploadAttachment(p.space_id, file, file.name, { folder: `pratiche/${p.id}` });
      await mutate({
        table: 'procedure_docs',
        action: 'update',
        payload: { attachment_id: saved.id },
        match: { id: target.id },
      });
      toast(`«${target.name}» caricato`);
    } catch (e) {
      toast('Caricamento non riuscito: ' + (e as Error).message);
    }
    setTarget(null);
  }

  function activate(doc: ProcedureDoc, path: string | undefined) {
    if (path) {
      return void openAttachment(path);
    }
    if (!writable) {
      return;
    }
    setTarget(doc);
    input.current?.click();
  }

  return (
    <>
      <div className="pill-row" style={{ marginTop: 0 }}>
        {p.procedure_docs.map((d) => (
          <button
            key={d.id}
            className="pill"
            style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
            aria-label={d.attachment_id ? `Apri ${d.name}` : `Carica ${d.name}`}
            onClick={() => activate(d, attachments.find((a) => a.id === d.attachment_id)?.path)}
          >
            {d.attachment_id ? <Check size={14} strokeWidth={3} /> : <Paperclip size={14} />} {d.name}
          </button>
        ))}
        {p.procedure_docs.length === 0 && (
          <span className="muted" style={{ fontSize: 14 }}>
            Nessun documento richiesto.
          </span>
        )}
      </div>
      <input
        ref={input}
        type="file"
        hidden
        accept="image/*,application/pdf"
        onChange={(e) => {
          void upload(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </>
  );
}
