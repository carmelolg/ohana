import { useRef, useState } from 'react';
import { Check, FileText, Paperclip } from 'lucide-react';
import { useAttachmentsByIds, useEventAttachments, useMutate } from '../../lib/data';
import { openAttachment, uploadAttachment } from '../../lib/files';
import { useToast } from '../../lib/toast';
import type { Procedure, ProcedureDoc, ProcedureStep } from '../../lib/types';
import { assignDoc, renameAttachment, renameProcedureDoc, type DocTarget } from './procedureCommands';
import { ActionButton } from '../../components/ActionButton';
import { RenameControl } from '../../components/RenameControl';

interface Props {
  procedure: Procedure;
  steps: ProcedureStep[];
  /** Impegni della pratica (dei passaggi e collegati) a cui si può legare un file. */
  events: { id: string; title: string }[];
  writable: boolean;
  onAdd: () => void;
}

/** File già caricato, da un documento richiesto o da un impegno, con il punto della pratica a cui è legato. */
interface FileRow {
  attachmentId: string;
  docId: string | null;
  name: string;
  path: string | undefined;
  target: DocTarget;
}

const encodeTarget = (t: DocTarget) => (t ? `${t.kind}:${t.id}` : '');
const decodeTarget = (v: string): DocTarget => {
  const [kind, id] = v.split(':');
  return id ? { kind: kind === 'event' ? 'event' : 'step', id } : null;
};

interface RowProps {
  row: FileRow;
  steps: ProcedureStep[];
  events: Props['events'];
  writable: boolean;
  onAssign: (row: FileRow, target: DocTarget) => void;
  onRename: (row: FileRow, name: string) => void;
}

/** Selettore unico: «Generale», le fasi e gli impegni della pratica. */
function TargetSelect({ row, steps, events, onAssign }: Omit<RowProps, 'writable' | 'onRename'>) {
  return (
    <select
      className="input doc-step"
      aria-label={`Fase o impegno di ${row.name}`}
      value={encodeTarget(row.target)}
      onChange={(e) => onAssign(row, decodeTarget(e.target.value))}
    >
      <option value="">Generale</option>
      <optgroup label="Fasi">
        {steps.map((s) => (
          <option key={s.id} value={`step:${s.id}`}>
            {s.title}
          </option>
        ))}
      </optgroup>
      <optgroup label="Impegni">
        {events.map((e) => (
          <option key={e.id} value={`event:${e.id}`}>
            {e.title}
          </option>
        ))}
      </optgroup>
    </select>
  );
}

function targetLabel(t: DocTarget, steps: ProcedureStep[], events: Props['events']): string {
  const list: { id: string; title: string }[] = t?.kind === 'event' ? events : steps;
  return list.find((x) => x.id === t?.id)?.title ?? 'Generale';
}

/** File già caricato: si apre con un tocco e (se si può scrivere) si lega a una fase o a un impegno. */
function UploadedRow({ row, steps, events, writable, onAssign, onRename }: RowProps) {
  return (
    <div className="doc-row">
      <ActionButton
        className="doc-open"
        aria-label={`Apri ${row.name}`}
        disabled={!row.path}
        onAction={() => (row.path ? openAttachment(row.path) : Promise.resolve())}
      >
        <Check size={16} strokeWidth={3} />
        <span className="doc-name">{row.name}</span>
      </ActionButton>
      {writable ? (
        <TargetSelect row={row} steps={steps} events={events} onAssign={onAssign} />
      ) : (
        <span className="muted doc-where">{targetLabel(row.target, steps, events)}</span>
      )}
      {writable && (
        <RenameControl label={row.name} current={row.name} onRename={(name) => onRename(row, name)} />
      )}
    </div>
  );
}

/** Documento richiesto ancora mancante: un tocco apre la scelta del file. */
function MissingRow({
  doc,
  writable,
  onPick,
  onRename,
}: {
  doc: ProcedureDoc;
  writable: boolean;
  onPick: (doc: ProcedureDoc) => void;
  onRename: (docId: string, name: string) => void;
}) {
  return (
    <div className="doc-row">
      <span className="doc-open">
        <Paperclip size={16} />
        <span className="doc-name">{doc.name}</span>
      </span>
      {writable && (
        <button className="pill" aria-label={`Carica ${doc.name}`} onClick={() => onPick(doc)}>
          Carica
        </button>
      )}
      {writable && (
        <RenameControl label={doc.name} current={doc.name} onRename={(name) => onRename(doc.id, name)} />
      )}
    </div>
  );
}

/** Righe dei file caricati: documenti della pratica più allegati nati sugli impegni, in un elenco solo. */
function useFileRows(p: Procedure, events: Props['events']): FileRow[] {
  const uploaded = p.procedure_docs.filter((d) => d.attachment_id);
  const { data: atts = [] } = useAttachmentsByIds(uploaded.map((d) => d.attachment_id as string));
  const { data: eventAtts = [] } = useEventAttachments(events.map((e) => e.id));
  const eventOf = (attachmentId: string | null): DocTarget => {
    const found = eventAtts.find((a) => a.id === attachmentId);
    return found ? { kind: 'event', id: found.event_id } : null;
  };
  const fromDocs = uploaded.map((d): FileRow => {
    const att = atts.find((a) => a.id === d.attachment_id);
    const onEvent = eventOf(d.attachment_id);
    return {
      attachmentId: d.attachment_id as string,
      docId: d.id,
      name: d.name,
      path: att?.path,
      target: onEvent ?? (d.step_id ? { kind: 'step', id: d.step_id } : null),
    };
  });
  const known = new Set(uploaded.map((d) => d.attachment_id));
  const fromEvents = eventAtts
    .filter((a) => !known.has(a.id))
    .map((a): FileRow => ({
      attachmentId: a.id,
      docId: null,
      name: a.name,
      path: a.path,
      target: { kind: 'event', id: a.event_id },
    }));
  return [...fromDocs, ...fromEvents];
}

/** Scelta e caricamento del file: per un documento richiesto (lo completa) o libero (diventa un documento generale). */
function useDocUpload(p: Procedure) {
  const mutate = useMutate();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [target, setTarget] = useState<ProcedureDoc | null>(null);

  async function upload(file: File | undefined) {
    if (!file) {
      return;
    }
    try {
      const saved = await uploadAttachment(p.space_id, file, file.name, { folder: `pratiche/${p.id}` });
      if (target) {
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
      } else {
        await assignDoc(mutate, p, { attachmentId: saved.id, name: file.name, docId: null }, null);
        toast(`«${file.name}» allegato`);
      }
    } catch (e) {
      toast('Caricamento non riuscito: ' + (e as Error).message);
    }
    setTarget(null);
  }

  function pick(doc: ProcedureDoc | null) {
    setTarget(doc);
    input.current?.click();
  }

  return { input, pick, upload };
}

/**
 * Documenti della pratica in due gruppi: «Da caricare» (richiesti e mancanti) e «Caricati»
 * (con la fase o l'impegno a cui appartengono: gli stessi che li mostrano come chip nella cronologia).
 */
export function DocsSection({ procedure: p, steps, events, writable, onAdd }: Props) {
  const mutate = useMutate();
  const { input, pick, upload } = useDocUpload(p);
  const rows = useFileRows(p, events);
  const missing = p.procedure_docs.filter((d) => !d.attachment_id);
  const renameDocRow = (docId: string, name: string) => void renameProcedureDoc(mutate, p, docId, name);
  // un allegato d'impegno non ha una riga `procedure_docs`: si rinomina il file stesso
  const renameRow = (row: FileRow, name: string) =>
    row.docId ? renameDocRow(row.docId, name) : void renameAttachment(mutate, row.attachmentId, name);

  return (
    <section className="docs-section" aria-label="Documenti">
      <span className="label">Documenti</span>
      {writable && (
        <div className="docs-actions">
          <button className="pill" onClick={() => pick(null)}>
            + Allega file
          </button>
          <button className="pill" onClick={onAdd}>
            + Documento richiesto
          </button>
        </div>
      )}
      {p.procedure_docs.length === 0 && rows.length === 0 && (
        <p className="muted">
          <FileText size={14} /> Nessun documento. Allega un file e legalo a una fase o a un impegno.
        </p>
      )}
      {missing.length > 0 && <span className="muted docs-group">Da caricare · {missing.length}</span>}
      {missing.map((d) => (
        <MissingRow key={d.id} doc={d} writable={writable} onPick={pick} onRename={renameDocRow} />
      ))}
      {rows.length > 0 && <span className="muted docs-group">Caricati · {rows.length}</span>}
      {rows.map((r) => (
        <UploadedRow
          key={r.attachmentId}
          row={r}
          steps={steps}
          events={events}
          writable={writable}
          onRename={renameRow}
          onAssign={(row, to) =>
            void assignDoc(
              mutate,
              p,
              { attachmentId: row.attachmentId, name: row.name, docId: row.docId },
              to,
            )
          }
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
