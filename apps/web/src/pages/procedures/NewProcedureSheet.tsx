import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PROCEDURE_TEMPLATES, type ProcedureTemplate } from '@ohana/shared';
import { Field } from '../../components/Field';
import { Sheet } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { fullName } from '../../lib/color';
import { useMutate, useSpace } from '../../lib/data';
import { newId } from '../../lib/outbox';
import { useToast } from '../../lib/toast';
import type { Member, Space } from '../../lib/types';
import { createProcedure } from '../procedure/procedureCommands';

interface Props {
  tpl: ProcedureTemplate;
  text: string;
  onClose: () => void;
}

function TemplatePicker({ value, onPick }: { value: string; onPick: (t: ProcedureTemplate) => void }) {
  return (
    <div className="pill-row" style={{ marginTop: 0 }} role="group" aria-label="Modello">
      {PROCEDURE_TEMPLATES.map((t) => (
        <button
          key={t.key}
          type="button"
          className="pill"
          aria-pressed={value === t.key}
          onClick={() => onPick(t)}
        >
          {t.key === 'custom' ? 'Personalizzata' : t.title}
        </button>
      ))}
    </div>
  );
}

interface DetailsProps {
  spaces: Space[];
  spaceId: string;
  onSpace: (id: string) => void;
  members: Member[];
  owner: string;
  onOwner: (id: string) => void;
  due: string;
  onDue: (date: string) => void;
}

function DetailsFields(d: DetailsProps) {
  return (
    <>
      {d.spaces.length > 1 && (
        <select
          className="input"
          aria-label="Spazio"
          value={d.spaceId}
          onChange={(e) => d.onSpace(e.target.value)}
        >
          {d.spaces.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      )}
      <Field label="Chi se ne occupa">
        <select
          className="input"
          aria-label="Responsabile"
          value={d.owner}
          onChange={(e) => d.onOwner(e.target.value)}
        >
          <option value="">Nessuno</option>
          {d.members.map((m) => (
            <option key={m.user_id} value={m.user_id}>
              {fullName(m.profiles)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Scadenza (facoltativa)">
        <input
          className="input"
          type="date"
          aria-label="Scadenza"
          value={d.due}
          onChange={(e) => d.onDue(e.target.value)}
        />
      </Field>
    </>
  );
}

/** Nuova pratica da un modello: titolo, spazio, responsabile e scadenza. */
export function NewProcedureSheet({ tpl: initial, text, onClose }: Props) {
  const { session } = useAuth();
  const { spaces, selected, defaultSpace, canWrite } = useSpace();
  const mutate = useMutate();
  const nav = useNavigate();
  const toast = useToast();
  const [tpl, setTpl] = useState(initial);
  const [spaceId, setSpaceId] = useState((selected !== 'all' ? selected : defaultSpace?.id) ?? '');
  const [title, setTitle] = useState(text || initial.title);
  const [owner, setOwner] = useState(session?.user.id ?? '');
  const [due, setDue] = useState('');
  const [err, setErr] = useState('');
  const members = useMemo(() => spaces.find((s) => s.id === spaceId)?.space_members ?? [], [spaces, spaceId]);

  function pick(t: ProcedureTemplate) {
    setTpl(t);
    if (!title.trim() || PROCEDURE_TEMPLATES.some((x) => x.title === title)) {
      setTitle(t.title);
    }
  }

  async function create() {
    if (!title.trim()) {
      return setErr('Dai un nome alla pratica');
    }
    if (!spaceId) {
      return setErr('Scegli uno spazio');
    }
    const id = newId();
    try {
      await createProcedure(mutate, {
        id,
        spaceId,
        title: title.trim(),
        ownerId: owner,
        dueDate: due,
        template: tpl,
      });
      toast('Pratica creata');
      onClose();
      nav(`/pratiche/${id}`);
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <Sheet onClose={onClose} label="Nuova pratica">
      <div className="stack">
        <h3 style={{ fontSize: 20 }}>Nuova pratica</h3>
        <div className="label">Modello</div>
        <TemplatePicker value={tpl.key} onPick={pick} />
        {tpl.steps.length > 0 && (
          <p className="muted" style={{ fontSize: 13 }}>
            {tpl.steps.length} passaggi e {tpl.docs.length} documenti già pronti: potrai cambiarli.
          </p>
        )}
        <input
          className="input"
          aria-label="Titolo"
          placeholder="Titolo (es. ISEE 2027 mamma)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <DetailsFields
          spaces={spaces.filter((s) => canWrite(s.id))}
          spaceId={spaceId}
          onSpace={setSpaceId}
          members={members}
          owner={owner}
          onOwner={setOwner}
          due={due}
          onDue={setDue}
        />
        {err && (
          <p className="error" role="alert">
            {err}
          </p>
        )}
        <div className="hstack">
          <button className="btn ghost" style={{ flex: 1 }} onClick={onClose}>
            Annulla
          </button>
          <button className="btn accent" style={{ flex: 1 }} onClick={create}>
            Crea pratica
          </button>
        </div>
      </div>
    </Sheet>
  );
}
