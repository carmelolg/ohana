import { useMemo, useState } from 'react';
import { parseMoneyInput, splitEqual } from '@ohana/shared';
import { Sheet } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { useMutate, useSpace } from '../../lib/data';
import { createExpense } from './expenseCommands';
import { ExpenseFields, ModeSwitch } from './ExpenseFields';
import { ShareRow } from './ShareRow';
import { useParticipants } from './useParticipants';
import { expenseProblem, sharesFor, type SplitMode } from './splits';

interface Props {
  initialSpace: string;
  /** Impegno a cui la spesa è collegata (es. il ticket di una visita). */
  eventId?: string;
  initialDesc: string;
  initialAmount: string;
  onClose: () => void;
}

/** Nuova spesa da dividere tra i membri dello spazio, in parti uguali o personalizzate. */
export function ExpenseForm({ initialSpace, eventId, initialDesc, initialAmount, onClose }: Props) {
  const { session } = useAuth();
  const me = session?.user.id ?? '';
  const { spaces, canWrite } = useSpace();
  const mutate = useMutate();
  const [spaceId, setSpaceId] = useState(initialSpace);
  const [desc, setDesc] = useState(initialDesc);
  const [amount, setAmount] = useState(initialAmount);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const members = useMemo(() => spaces.find((s) => s.id === spaceId)?.space_members ?? [], [spaces, spaceId]);
  const { included, toggle: toggleMember, payer, setPayer } = useParticipants(members, me);
  const [mode, setMode] = useState<SplitMode>('uguali');
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  const total = parseMoneyInput(amount) ?? 0;
  const participants = [...included];
  const equalShares = splitEqual(total, participants);

  async function save() {
    const shares = sharesFor(mode, total, participants, custom);
    const problem = expenseProblem(desc, total, participants, shares);
    if (problem) {
      return setError(problem);
    }
    try {
      await createExpense(mutate, {
        spaceId,
        payerId: payer,
        amount: total,
        description: desc.trim(),
        date,
        eventId: eventId ?? null,
        shares,
      });
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Sheet onClose={onClose} label="Nuova spesa">
      <div className="stack">
        <h3 style={{ fontSize: 20 }}>Nuova spesa{eventId ? ' · collegata all’impegno' : ''}</h3>
        <ExpenseFields
          spaces={eventId ? [] : spaces.filter((s) => canWrite(s.id))}
          spaceId={spaceId}
          onSpace={setSpaceId}
          desc={desc}
          onDesc={setDesc}
          amount={amount}
          onAmount={setAmount}
          date={date}
          onDate={setDate}
          members={members}
          me={me}
          payer={payer}
          onPayer={setPayer}
        />
        <ModeSwitch mode={mode} onMode={setMode} />
        {members.map((m) => (
          <ShareRow
            key={m.user_id}
            member={m}
            isMe={m.user_id === me}
            included={included.has(m.user_id)}
            mode={mode}
            equalShares={equalShares}
            customValue={custom[m.user_id] ?? ''}
            onToggle={() => toggleMember(m.user_id)}
            onCustom={(value) => setCustom({ ...custom, [m.user_id]: value })}
          />
        ))}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="btn accent" onClick={save}>
          Salva spesa
        </button>
      </div>
    </Sheet>
  );
}
