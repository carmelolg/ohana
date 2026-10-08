import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Paperclip, Trash2 } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useMutate, useVisitNotes } from '../../lib/data';
import { openAttachment, uploadAttachment } from '../../lib/files';
import { useToast } from '../../lib/toast';
import type { EventRow } from '../../lib/types';
import { addVisitNote, deleteVisitNote, saveTicketAmount } from './visitCommands';

const ticketText = (amount: number | string | null) => String(amount).replace('.', ',');

function NoteList({
  notes,
  me,
  writable,
  onDelete,
}: {
  notes: { id: string; text: string; author_id: string }[];
  me: string | undefined;
  writable: boolean;
  onDelete: (id: string) => void;
}) {
  return (
    <>
      {notes.map((n) => (
        <div key={n.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
          <p style={{ flex: 1, fontSize: 15, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>{n.text}</p>
          {n.author_id === me && writable && (
            <button
              className="icon-btn"
              style={{ minWidth: 36, minHeight: 36 }}
              aria-label="Elimina la nota"
              onClick={() => onDelete(n.id)}
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ))}
      {notes.length === 0 && !writable && <p className="muted">Nessuna nota.</p>}
    </>
  );
}

function NoteForm({ onAdd }: { onAdd: (text: string) => void }) {
  const [note, setNote] = useState('');
  const add = () => {
    onAdd(note.trim());
    setNote('');
  };
  return (
    <>
      <label className="sr-only" htmlFor="visit-note">
        Com'è andata
      </label>
      <textarea
        id="visit-note"
        className="input"
        placeholder="Es. Pressione nella norma. Ridurre il sale, continuare la terapia."
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <button className="btn small" style={{ marginTop: 8 }} onClick={add} disabled={!note.trim()}>
        Aggiungi nota
      </button>
    </>
  );
}

function Reports({
  visit: ev,
  writable,
  onFile,
}: {
  visit: EventRow;
  writable: boolean;
  onFile: (f: File) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  return (
    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {ev.attachments.map((a) => (
        <button
          key={a.id}
          className="pill"
          style={{ alignSelf: 'flex-start' }}
          onClick={() => void openAttachment(a.path)}
        >
          <Paperclip size={14} /> {a.name}
        </button>
      ))}
      {writable && (
        <button
          className="pill"
          style={{ alignSelf: 'flex-start' }}
          onClick={() => fileInput.current?.click()}
        >
          + Referto
        </button>
      )}
      <input
        ref={fileInput}
        type="file"
        hidden
        accept="image/*,application/pdf"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            onFile(file);
          }
          e.target.value = '';
        }}
      />
    </div>
  );
}

function TicketRow({ amount, onSend }: { amount: number | string | null; onSend: (value: string) => void }) {
  const [ticket, setTicket] = useState(amount != null ? ticketText(amount) : '');
  return (
    <div className="hstack" style={{ marginTop: 12 }}>
      <label className="sr-only" htmlFor="visit-ticket">
        Importo del ticket
      </label>
      <input
        id="visit-ticket"
        className="input"
        style={{ maxWidth: 150 }}
        inputMode="decimal"
        placeholder="Ticket €"
        value={ticket}
        onChange={(e) => setTicket(e.target.value)}
      />
      <button className="pill" onClick={() => onSend(ticket)}>
        {amount ? `Ticket ${ticketText(amount)} € → Spese` : 'Ticket → Spese'}
      </button>
    </div>
  );
}

/** Note libere sulla visita, referti allegati e ticket da portare nelle Spese. */
export function NotesCard({ visit: ev, writable }: { visit: EventRow; writable: boolean }) {
  const { session } = useAuth();
  const nav = useNavigate();
  const mutate = useMutate();
  const toast = useToast();
  const { data: notes = [] } = useVisitNotes(ev.id);

  async function attachReport(file: File) {
    try {
      await uploadAttachment(ev.space_id, file, file.name, { eventId: ev.id, folder: `eventi/${ev.id}` });
      toast('Referto allegato');
    } catch (e) {
      toast('Caricamento non riuscito: ' + (e as Error).message);
    }
  }

  async function ticketToExpenses(value: string) {
    if (!(await saveTicketAmount(mutate, ev.id, value))) {
      return toast('Scrivi l’importo del ticket');
    }
    nav(`/spese?evento=${ev.id}&spazio=${ev.space_id}`);
  }

  return (
    <div className="card" style={{ marginTop: 8 }}>
      <NoteList
        notes={notes}
        me={session?.user.id}
        writable={writable}
        onDelete={(id) => void deleteVisitNote(mutate, id)}
      />
      {writable && <NoteForm onAdd={(text) => void addVisitNote(mutate, ev.id, session!.user.id, text)} />}
      <Reports visit={ev} writable={writable} onFile={(f) => void attachReport(f)} />
      {writable && <TicketRow amount={ev.amount} onSend={(v) => void ticketToExpenses(v)} />}
    </div>
  );
}
