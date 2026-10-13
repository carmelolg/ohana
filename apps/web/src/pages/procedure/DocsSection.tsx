import { useRef, useState } from 'react';
import { Check, FileText, Paperclip } from 'lucide-react';
import { useAttachmentsByIds, useMutate } from '../../lib/data';
import { openAttachment, uploadAttachment } from '../../lib/files';
import { useToast } from '../../lib/toast';
import type { Procedure, ProcedureDoc, ProcedureStep } from '../../lib/types';
import { setDocStep } from './procedureCommands';

interface Props {
  procedure: Procedure;
  steps: ProcedureStep[];
  writable: boolean;
  onAdd: () => void;
}

interface RowProps {
  doc: ProcedureDoc;
  steps: ProcedureStep[];
  writable: boolean;
  path: string | undefined;
  onPick: (doc: ProcedureDoc) => void;
  onMove: (doc: ProcedureDoc, stepId: string | null) => void;
}

/** Documento già caricato: si apre con un tocco, e (se si può scrivere) si lega a una fase della cronologia. */
function UploadedRow({ doc, steps, writable, path, onMove }: Omit<RowProps, 'onPick'>) {
  return (
    <div className="doc-row">
      <button
        className="doc-open"
        aria-label={`Apri ${doc.name}`}
        disabled={!path}
        onClick={() => path && void openAttachment(path)}
      >
        <Check size={16} strokeWidth={3} />
        <span>{doc.name}</span>
      </button>
      {writable ? (
        <select
          className="input doc-step"
          aria-label={`Fase di ${doc.name}`}
          value={doc.step_id ?? ''}
          onChange={(e) => onMove(doc, e.target.value || null)}
        >
          <option value="">Generale</option>
          {steps.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      ) : (
        <span className="muted">{steps.find((s) => s.id === doc.step_id)?.title ?? 'Generale'}</span>
      )}
    </div>
  );
}

/** Documento richiesto ancora mancante: un tocco apre la scelta del file. */
function MissingRow({ doc, writable, onPick }: Pick<RowProps, 'doc' | 'writable' | 'onPick'>) {
  return (
    <div className="doc-row">
      <span className="doc-open">
        <Paperclip size={16} />
        <span>{doc.name}</span>
      </span>
      {writable && (
        <button className="pill" aria-label={`Carica ${doc.name}`} onClick={() => onPick(doc)}>
          Carica
        </button>
      )}
    </div>
  );
}

/**
 * Documenti della pratica in due gruppi: «Da caricare» (richiesti e mancanti) e «Caricati»
 * (con la fase a cui appartengono: la stessa che li mostra come chip nella cronologia).
 */
export function DocsSection({ procedure: p, steps, writable, onAdd }: Props) {
  const mutate = useMutate();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [target, setTarget] = useState<ProcedureDoc | null>(null);
  const { data: atts = [] } = useAttachmentsByIds(
    p.procedure_docs.map((d) => d.attachment_id).filter((id): id is string => !!id),
  );
  const missing = p.procedure_docs.filter((d) => !d.attachment_id);
  const uploaded = p.procedure_docs.filter((d) => d.attachment_id);

  async function upload(file: File | undefined) {
    if (!file || !target) {
      return;
    }
    try {
      const saved = await uploadAttachment(p.space_id, file, file.name, { folder: `pratiche/${p.id}` });
      await mutate(
        {
          table: 'procedure_docs',
          action: 'update',
          payload: { attachment_id: saved.id },
          match: { id: target.id },
        },
        [],
      );
      toast(`«${target.name}» caricato`);
    } catch (e) {
      toast('Caricamento non riuscito: ' + (e as Error).message);
    }
    setTarget(null);
  }

  function pick(doc: ProcedureDoc) {
    setTarget(doc);
    input.current?.click();
  }

  return (
    <section className="docs-section" aria-label="Documenti">
      <div className="hstack" style={{ justifyContent: 'space-between' }}>
        <span className="label">Documenti</span>
        {writable && (
          <button className="pill" onClick={onAdd}>
            + Documento richiesto
          </button>
        )}
      </div>
      {p.procedure_docs.length === 0 && (
        <p className="muted">
          <FileText size={14} /> Nessun documento. Gli allegati delle fasi e degli impegni compaiono nella
          cronologia.
        </p>
      )}
      {missing.length > 0 && <span className="muted">Da caricare · {missing.length}</span>}
      {missing.map((d) => (
        <MissingRow key={d.id} doc={d} writable={writable} onPick={pick} />
      ))}
      {uploaded.length > 0 && <span className="muted">Caricati · {uploaded.length}</span>}
      {uploaded.map((d) => (
        <UploadedRow
          key={d.id}
          doc={d}
          steps={steps}
          writable={writable}
          path={atts.find((a) => a.id === d.attachment_id)?.path}
          onMove={(doc, stepId) => void setDocStep(mutate, p, doc.id, stepId)}
        />
      ))}
      <input
        ref={input}
        type="file"
        hidden
        accept="image/*,application/pdf"
        aria-label="Scegli il file da caricare"
        onChange={(e) => {
          void upload(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </section>
  );
}
