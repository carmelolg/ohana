import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { DAY_MS } from '@ohana/shared';
import { BackLink } from '../components/BackLink';
import { useContacts, useEvents, useMutate, useSpace } from '../lib/data';
import { useDialog } from '../lib/dialog';
import { ContactCard } from './contacts/ContactCard';
import { deleteContact, saveContact, type ContactDraft } from './contacts/contactCommands';
import { ContactSheet } from './contacts/ContactSheet';
import { Filters } from './contacts/Filters';
import { filterContacts } from './contacts/filter';

const HISTORY_RADIUS_MS = 365 * DAY_MS;

/** Rubrica dello spazio: ricerca per nome, filtro per ruolo, storico degli impegni di ciascun contatto. */
export function ContactsPage() {
  const { selected, spaces, defaultSpace, canWrite, spaceById } = useSpace();
  const { data: contacts = [] } = useContacts();
  const range = useMemo(
    () => ({ from: new Date(Date.now() - HISTORY_RADIUS_MS), to: new Date(Date.now() + HISTORY_RADIUS_MS) }),
    [],
  );
  const { data: events = [] } = useEvents(range.from, range.to);
  const [role, setRole] = useState('');
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<ContactDraft | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const mutate = useMutate();
  const dialog = useDialog();

  const currentSpaceId = selected === 'all' ? defaultSpace?.id : selected;
  const { roles, shown } = filterContacts(contacts, selected, role, query);
  const writable = canWrite(currentSpaceId);

  async function save() {
    const spaceId = draft?.space_id ?? currentSpaceId;
    if (!draft?.name?.trim() || !spaceId) {
      return;
    }
    await saveContact(mutate, draft, spaceId);
    setDraft(null);
  }

  async function remove(id: string) {
    if (!(await dialog.confirm({ title: 'Eliminare il contatto?', confirmLabel: 'Elimina', danger: true }))) {
      return;
    }
    await deleteContact(mutate, id);
    setDraft(null);
  }

  return (
    <>
      <BackLink to="/famiglia" label="Famiglia" />
      <div className="hstack" style={{ justifyContent: 'space-between' }}>
        <h2 className="page-title">Rubrica</h2>
        {writable && (
          <button className="btn small" style={{ marginTop: 22 }} onClick={() => setDraft({})}>
            <Plus size={16} /> Nuovo
          </button>
        )}
      </div>
      <Filters query={query} onQuery={setQuery} roles={roles} role={role} onRole={setRole} />
      <div className="list">
        {shown.map((c) => (
          <ContactCard
            key={c.id}
            contact={c}
            space={spaceById(c.space_id)}
            showSpace={selected === 'all'}
            history={events
              .filter((e) => e.contact_id === c.id)
              .sort((a, b) => b.starts_at.localeCompare(a.starts_at))}
            expanded={openId === c.id}
            canEdit={canWrite(c.space_id)}
            onToggle={() => setOpenId(openId === c.id ? null : c.id)}
            onEdit={() => setDraft(c)}
          />
        ))}
        {shown.length === 0 && <div className="empty">Nessun contatto</div>}
      </div>

      {draft && (
        <ContactSheet
          draft={draft}
          onChange={setDraft}
          defaultSpaceId={currentSpaceId}
          writableSpaces={spaces.filter((s) => canWrite(s.id))}
          onSave={save}
          onDelete={remove}
          onClose={() => setDraft(null)}
        />
      )}
    </>
  );
}
