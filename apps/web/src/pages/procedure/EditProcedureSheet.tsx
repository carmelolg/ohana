import { useState } from 'react';
import { Field } from '../../components/Field';
import { Sheet } from '../../components/ui';
import { fullName } from '../../lib/color';
import { useMutate } from '../../lib/data';
import { useDialog } from '../../lib/dialog';
import type { Member, Procedure } from '../../lib/types';

interface Props {
  procedure: Procedure;
  members: Member[];
  onClose: () => void;
  onDeleted: () => void;
}

/** Modifica della pratica: titolo, responsabile, scadenza, stato; eliminazione. */
export function EditProcedureSheet({ procedure: p, members, onClose, onDeleted }: Props) {
  const mutate = useMutate();
  const dialog = useDialog();
  const [title, setTitle] = useState(p.title);
  const [owner, setOwner] = useState(p.owner_id ?? '');
  const [due, setDue] = useState(p.due_date ?? '');
  const [status, setStatus] = useState(p.status);

  async function save() {
    await mutate({
      table: 'procedures',
      action: 'update',
      payload: { title: title.trim() || p.title, owner_id: owner || null, due_date: due || null, status },
      match: { id: p.id },
    });
    onClose();
  }

  async function remove() {
    const confirmed = await dialog.confirm({
      title: `Eliminare «${p.title}»?`,
      message: 'Spariscono passaggi e documenti richiesti (i file caricati restano negli allegati).',
      confirmLabel: 'Elimina',
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    await mutate({ table: 'procedures', action: 'delete', match: { id: p.id } });
    onDeleted();
  }

  return (
    <Sheet onClose={onClose} label="Modifica pratica">
      <div className="stack">
        <h3 style={{ fontSize: 20 }}>Modifica pratica</h3>
        <input
          className="input"
          aria-label="Titolo"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Field label="Chi se ne occupa">
          <select
            className="input"
            aria-label="Responsabile"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
          >
            <option value="">Nessuno</option>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {fullName(m.profiles)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Scadenza">
          <input
            className="input"
            type="date"
            aria-label="Scadenza"
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
        </Field>
        <Field label="Stato">
          <select
            className="input"
            aria-label="Stato"
            value={status}
            onChange={(e) => setStatus(e.target.value as Procedure['status'])}
          >
            <option value="in_corso">In corso</option>
            <option value="completata">Completata</option>
            <option value="archiviata">Archiviata</option>
          </select>
        </Field>
        <div className="hstack">
          <button className="btn danger small" onClick={remove}>
            Elimina
          </button>
          <span style={{ flex: 1 }} />
          <button className="btn accent" onClick={save}>
            Salva
          </button>
        </div>
      </div>
    </Sheet>
  );
}
