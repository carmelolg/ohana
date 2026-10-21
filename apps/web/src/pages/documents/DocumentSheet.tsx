import { Sheet } from '../../components/ui';
import { openAttachment } from '../../lib/files';
import type { DocumentRow } from '../../lib/types';
import { DOC_DATE } from './listing';
import { ActionButton } from '../../components/ActionButton';
import { RenameControl } from '../../components/RenameControl';

interface Props {
  doc: DocumentRow;
  canDelete: boolean;
  /** Rinomina il documento: solo per chi può scrivere nello spazio. */
  onRename?: (title: string) => void;
  onDelete: () => void;
  onClose: () => void;
}

/** Valori letti dal documento (fornitore, importo), solo quelli presenti. */
export function extractedRows(doc: DocumentRow): [string, string][] {
  const data = doc.extracted_json;
  if (!data) {
    return [];
  }
  const rows: [string, unknown][] = [
    ['Fornitore', data.supplier],
    ['Importo', data.amount != null ? `${String(data.amount).replace('.', ',')} €` : null],
  ];
  return rows.filter(([, v]) => v).map(([k, v]) => [k, String(v)]);
}

/** Dettaglio di un documento: cartella, scadenza, dati letti, apri file / elimina. */
export function DocumentSheet({ doc, canDelete, onRename, onDelete, onClose }: Props) {
  const rows = extractedRows(doc);
  const shownName = doc.title || doc.attachments?.name || 'documento';
  return (
    <Sheet onClose={onClose} label="Documento">
      <div className="stack">
        <h3 style={{ fontSize: 20 }}>{shownName}</h3>
        {onRename && <RenameControl label="il documento" current={shownName} onRename={onRename} />}
        <p className="muted" style={{ fontSize: 14 }}>
          {doc.folder}
          {doc.expires_at ? ` · scade ${DOC_DATE.format(new Date(doc.expires_at + 'T09:00:00'))}` : ''}
        </p>
        {rows.length > 0 && (
          <div className="card" style={{ padding: '4px 16px' }}>
            {rows.map(([k, v]) => (
              <div key={k} className="kv">
                <span>{k}</span>
                <span>{v}</span>
              </div>
            ))}
          </div>
        )}
        <div className="hstack" style={{ flexWrap: 'wrap' }}>
          {doc.attachments && (
            <ActionButton
              className="btn"
              busyLabel="Apro…"
              onAction={() => openAttachment(doc.attachments!.path)}
            >
              Apri file
            </ActionButton>
          )}
          {canDelete && (
            <button className="btn danger small" onClick={onDelete}>
              Elimina
            </button>
          )}
        </div>
      </div>
    </Sheet>
  );
}
