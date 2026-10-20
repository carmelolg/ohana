import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { BackLink } from '../../components/BackLink';
import { openCareFile, removeCareFile, uploadCareFile } from '../../lib/api/careFiles';
import { useCareEntries, useCareEvents, useCareFiles, type CareReminderEvent } from '../../lib/data';
import { openAttachment } from '../../lib/files';
import { useToast } from '../../lib/toast';
import type { CareFile } from '../../lib/types';
import { useRecipientData } from './useRecipientData';
import { ActionButton } from '../../components/ActionButton';

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
  onRemove: (() => Promise<unknown>) | null;
}) {
  return (
    <div className="kv">
      <ActionButton className="file-chip" onAction={() => openCareFile(file.path)}>
        📎 {file.name}
      </ActionButton>
      <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}>
        {label} · {FULL_DATE.format(new Date(file.created_at))}
        {onRemove && (
          <ActionButton className="icon-btn" aria-label={`Elimina ${file.name}`} onAction={onRemove}>
            ×
          </ActionButton>
        )}
      </span>
    </div>
  );
}

/** Allegati degli impegni del filone (visite, esami programmati): stanno nel bucket generico, ma si vedono qui in ordine di data. */
function EventAttachments({ events }: { events: CareReminderEvent[] }) {
  return (
    <section aria-label="Allegati degli impegni">
      <h2 className="label" style={{ marginTop: 18 }}>
        Dagli impegni
      </h2>
      <div className="group">
        {events.flatMap((e) =>
          e.attachments.map((a) => (
            <div className="kv" key={a.id}>
              <ActionButton className="file-chip" onAction={() => openAttachment(a.path)}>
                📎 {a.name}
              </ActionButton>
              <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}>
                {e.title} · {FULL_DATE.format(new Date(e.starts_at))}
              </span>
            </div>
          )),
        )}
      </div>
    </section>
  );
}

/** Documenti della persona: referti, esami e ricette allegati ai tasselli o caricati direttamente, più gli allegati degli impegni dei suoi filoni. */
export function CareFilesPage() {
  const { rid } = useParams();
  const data = useRecipientData(rid);
  const toast = useToast();
  const qc = useQueryClient();
  const { data: files = [] } = useCareFiles(rid);
  const { data: entries = [] } = useCareEntries(rid);
  const { data: careEvents = [] } = useCareEvents();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const { recipient } = data;
  if (!recipient) {
    return data.loading ? (
      <div className="empty" role="status" aria-busy="true">
        Caricamento…
      </div>
    ) : (
      <div className="empty">Persona non trovata</div>
    );
  }
  const refresh = () => qc.invalidateQueries({ queryKey: ['care'] });
  const threadIds = new Set(data.threads.map((t) => t.id));
  const eventsWithFiles = careEvents
    .filter((e) => e.care_thread_id && threadIds.has(e.care_thread_id) && e.attachments.length > 0)
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at));

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
            onRemove={data.canWrite ? () => removeCareFile(f.id, f.path).then(refresh) : null}
          />
        ))}
      </div>
      {files.length === 0 && eventsWithFiles.length === 0 && (
        <div className="empty">Nessun documento. I referti allegati ai tasselli compaiono qui.</div>
      )}
      {eventsWithFiles.length > 0 && <EventAttachments events={eventsWithFiles} />}
      <p className="care-disclaimer">
        I file sanitari sono privati e si aprono con un link che scade dopo un minuto.
      </p>
    </div>
  );
}
