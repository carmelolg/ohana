import { Paperclip, X } from 'lucide-react';
import { openAttachment } from '../../lib/files';
import type { Attachment } from '../../lib/types';

interface Props {
  saved: Attachment[];
  pending: File[];
  onRemovePending: (index: number) => void;
}

/** Allegati già salvati (si aprono con un tocco) e file scelti ma non ancora caricati (si possono togliere). */
export function AttachmentList({ saved, pending, onRemovePending }: Props) {
  return (
    <>
      {saved.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div className="label">Allegati</div>
          {saved.map((a) => (
            <div key={a.id} className="item">
              <button
                className="txt"
                style={{ textAlign: 'left', minHeight: 44 }}
                onClick={() => void openAttachment(a.path)}
              >
                <Paperclip size={16} /> {a.name}
              </button>
            </div>
          ))}
        </div>
      )}
      {pending.map((f, i) => (
        <div key={i} className="item">
          <span className="txt">
            <Paperclip size={16} /> {f.name}
          </span>
          <button className="icon-btn" aria-label="Rimuovi allegato" onClick={() => onRemovePending(i)}>
            <X size={18} />
          </button>
        </div>
      ))}
    </>
  );
}
