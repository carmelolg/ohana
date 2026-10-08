import { useMemo, useState } from 'react';
import { formatDate, nextMaintenanceDate } from '@ohana/shared';
import { Sheet } from '../../components/ui';
import { useContacts, useMutate } from '../../lib/data';
import { fromDateInput, toDateInput } from '../../lib/date-input';
import { useToast } from '../../lib/toast';
import type { Maintenance } from '../../lib/types';
import { completeMaintenance, useScheduler } from './maintenanceCommands';

/** Prossima scadenza dopo `doneAt`; null se manca la data o la regola non ha occorrenze future. */
export function nextAfter(rrule: string, doneAt: Date | null, now: Date): Date | null {
  if (!doneAt) {
    return null;
  }
  try {
    return nextMaintenanceDate(rrule, doneAt, now);
  } catch {
    return null;
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

/** «Segna fatta»: aggiorna ultima volta, chiede (facoltativo) il costo e calcola la successiva. */
export function DoneSheet({ maintenance: m, onClose }: { maintenance: Maintenance; onClose: () => void }) {
  const mutate = useMutate();
  const schedule = useScheduler();
  const toast = useToast();
  const { data: contacts = [] } = useContacts();
  const now = useMemo(() => new Date(), []);
  const [date, setDate] = useState(toDateInput(now));
  const [cost, setCost] = useState('');
  const [contactId, setContactId] = useState(m.contact_id ?? '');
  const [error, setError] = useState('');
  const doneAt = fromDateInput(date);
  const next = useMemo(() => nextAfter(m.rrule, doneAt, now), [doneAt, m.rrule, now]);

  async function save() {
    if (!doneAt || !next) {
      return setError('Scegli la data');
    }
    try {
      await completeMaintenance(mutate, schedule, m, { doneAt, doneOn: date, cost, contactId, next });
      toast(`Fatto · prossima il ${formatDate(next)}`);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Sheet onClose={onClose} label="Manutenzione fatta">
      <div className="stack">
        <h3 style={{ fontSize: 20 }}>{m.title} · fatta</h3>
        <Field label="Quando">
          <input
            className="input"
            type="date"
            aria-label="Data"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        <Field label="Costo (facoltativo)">
          <input
            className="input"
            inputMode="decimal"
            aria-label="Costo"
            placeholder="€"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
          />
        </Field>
        <Field label="Chi l'ha fatta">
          <select
            className="input"
            aria-label="Professionista"
            value={contactId}
            onChange={(e) => setContactId(e.target.value)}
          >
            <option value="">Fai da te / nessuno</option>
            {contacts
              .filter((c) => c.space_id === m.space_id)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </Field>
        {next && (
          <p className="muted" style={{ fontSize: 14 }}>
            La prossima sarà il <b>{formatDate(next)}</b>.
          </p>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="hstack">
          <button className="btn ghost" style={{ flex: 1 }} onClick={onClose}>
            Annulla
          </button>
          <button className="btn accent" style={{ flex: 1 }} onClick={save}>
            Conferma
          </button>
        </div>
      </div>
    </Sheet>
  );
}
