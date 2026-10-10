import { Sheet } from '../../components/ui';
import { useContacts, useSpace } from '../../lib/data';
import type { Maintenance } from '../../lib/types';
import { MaintenanceFields } from './MaintenanceFields';
import { MaintenanceTimeline } from './MaintenanceTimeline';
import { type FormState } from './formState';
import { useMaintenanceForm } from './useMaintenanceForm';

export type { FormState } from './formState';

interface Props {
  state: FormState;
  onClose: () => void;
  onDone: (m: Maintenance) => void;
}

/** Nuova manutenzione o modifica di una esistente. */
export function MaintenanceForm({ state, onClose, onDone }: Props) {
  const { spaces, defaultSpace, selected, canWrite } = useSpace();
  const { data: contacts = [] } = useContacts();
  const defaultSpaceId = (selected !== 'all' ? selected : defaultSpace?.id) ?? '';
  const form = useMaintenanceForm({ state, defaultSpaceId, onClose });
  const { editing } = form;
  const writable = canWrite(form.values.spaceId);

  return (
    <Sheet onClose={onClose} label={editing ? 'Manutenzione' : 'Nuova manutenzione'}>
      <div className="stack">
        <h3 style={{ fontSize: 20 }}>{editing ? editing.title : 'Nuova manutenzione'}</h3>
        <MaintenanceFields
          values={form.values}
          onChange={form.change}
          template={form.template}
          disabled={!writable}
          spaces={editing ? [] : spaces.filter((s) => canWrite(s.id))}
          contacts={contacts}
        />
        {editing && <MaintenanceTimeline maintenance={editing} />}
        {form.error && (
          <p className="error" role="alert">
            {form.error}
          </p>
        )}
        {writable && (
          <div className="hstack" style={{ flexWrap: 'wrap' }}>
            {editing && (
              <button className="btn danger small" onClick={form.remove}>
                Elimina
              </button>
            )}
            {editing && (
              <button className="btn ghost small" onClick={() => onDone(editing)}>
                Segna fatta
              </button>
            )}
            <span style={{ flex: 1 }} />
            <button className="btn accent" onClick={form.save}>
              {editing ? 'Salva' : 'Aggiungi'}
            </button>
          </div>
        )}
      </div>
    </Sheet>
  );
}
