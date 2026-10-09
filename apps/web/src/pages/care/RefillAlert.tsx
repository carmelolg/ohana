import { useState } from 'react';
import { type CareTodo } from '@ohana/shared';
import { categoryIdOf } from '../../lib/api/careEvents';
import { refillDueDate, requestRefill } from '../../lib/api/medications';
import { useCategories, useMutate, useSpace } from '../../lib/data';
import { useToast } from '../../lib/toast';
import type { CareRecipient, Medication } from '../../lib/types';

interface Props {
  todo: CareTodo;
  med: Medication;
  recipient: CareRecipient;
  canWrite: boolean;
}

/** Avviso in cima alle terapie quando una scorta sta per finire: «Chiedi ricetta» e «Assegna a…». */
export function RefillAlert({ todo, med, recipient, canWrite }: Props) {
  const mutate = useMutate();
  const toast = useToast();
  const { memberName } = useSpace();
  const { data: categories = [] } = useCategories();
  const caregivers = recipient.caregiver_ids;
  const [assignee, setAssignee] = useState(recipient.duty_user_id ?? caregivers[0] ?? '');
  const [busy, setBusy] = useState(false);

  async function ask() {
    setBusy(true);
    try {
      await requestRefill(mutate, {
        med,
        dueDate: refillDueDate(todo.daysLeft ?? 0, new Date()),
        assigneeId: assignee || null,
        categoryId: categoryIdOf(categories, med.space_id, 'commissione'),
      });
      toast(`Commissione creata: ricetta ${med.name.toLowerCase()}`);
    } catch {
      toast('Non riesco a creare la commissione. Riprova.');
      setBusy(false);
    }
  }

  const who = med.refill_by ?? med.prescriber;
  return (
    <div className="care-alert" role="alert">
      <b>
        {med.name} {todo.detail.split(' · ')[0]}
      </b>
      <span className="muted" style={{ fontSize: 14 }}>
        {who ? `Serve la ricetta di ${who}.` : 'Serve la ricetta del medico.'}
      </span>
      {canWrite && (
        <div className="actions">
          <button className="btn accent small" disabled={busy} onClick={() => void ask()}>
            Chiedi ricetta
          </button>
          {caregivers.length > 0 && (
            <label className="hstack">
              <span className="sr-only">Assegna a</span>
              <select
                className="inline-select chip"
                value={assignee}
                aria-label="Assegna a"
                onChange={(e) => setAssignee(e.target.value)}
              >
                {caregivers.map((id) => (
                  <option key={id} value={id}>
                    Assegna a {memberName(id).split(' ')[0]}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}
    </div>
  );
}
