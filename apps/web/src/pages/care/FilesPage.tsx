import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { BackLink } from '../../components/BackLink';
import { openCareFile, removeCareFile, uploadCareFile } from '../../lib/api/careFiles';
import { useCareEntries, useCareFiles } from '../../lib/data';
import { useToast } from '../../lib/toast';
import type { CareFile } from '../../lib/types';
import { useRecipientData } from './useRecipientData';

const FULL_DATE = new Intl.DateTimeFormat('it-IT', {
  timeZone: 'Europe/Rome',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function FileRow({
  file,
  label,
  onRemove,
}: {
  file: CareFile;
  label: string;
  onRemove: (() => void) | null;
}) {
  return (
    <div className="kv">
      <button type="button" className="file-chip" onClick={() => void openCareFile(file.path)}>
        📎 {file.name}
      </button>
      <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}>
        {label} · {FULL_DATE.format(new Date(file.created_at))}
        {onRemove && (
          <button type="button" className="icon-btn" aria-label={`Elimina ${file.name}`} onClick={onRemove}>
            ×
          </button>
        )}
      </span>
    </div>
  );
}

/** Documenti della persona: referti, esami e ricette allegati ai tasselli o caricati direttamente. */
export function CareFilesPage() {
  const { rid } = useParams();
  const data = useRecipientData(rid);
  const toast = useToast();
  const qc = useQueryClient();
  const { data: files = [] } = useCareFiles(rid);
  const { data: entries = [] } = useCareEntries(rid);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const { recipient } = data;
  if (!recipient) {
    return data.loading ? (
      <div className="empty">Caricamento…</div>
    ) : (
      <div className="empty">Persona non trovata</div>
    );
  }
  const refresh = () => qc.invalidateQueries({ queryKey: ['care'] });

  async function upload(list: File[]) {
    setBusy(true);
    for (const file of list) {
      try {
        await uploadCareFile({
          spaceId: recipient!.space_id,
          recipientId: recipient!.id,
          entryId: null,
          file,
        });
      } catch (e) {
        toast((e as Error).message);
      }
    }
    await refresh();
    setBusy(false);
  }

  return (
    <div>
      <BackLink to={`/cura/${recipient.id}`} label={recipient.label ?? recipient.first_name} />
      <h1 className="care-name">Documenti</h1>
      {data.canWrite && (
        <>
          <button
            className="btn ghost small"
            style={{ margin: '12px 0' }}
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            + Carica referto o ricetta
          </button>
          <input
            ref={input}
            type="file"
            hidden
            multiple
            accept="image/*,application/pdf"
            onChange={(e) => void upload(Array.from(e.target.files ?? []))}
          />
        </>
      )}
      <div className="group">
        {files.map((f) => (
          <FileRow
            key={f.id}
            file={f}
            label={entries.find((e) => e.id === f.entry_id)?.title ?? 'Senza tassello'}
            onRemove={data.canWrite ? () => void removeCareFile(f.id, f.path).then(refresh) : null}
          />
        ))}
      </div>
      {files.length === 0 && (
        <div className="empty">Nessun documento. I referti allegati ai tasselli compaiono qui.</div>
      )}
      <p className="care-disclaimer">
        I file sanitari sono privati e si aprono con un link che scade dopo un minuto.
      </p>
    </div>
  );
}
