import { useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { careName, formatNumericDate } from '@ohana/shared';
import { Field } from '../../components/Field';
import { FormError } from '../../components/FormError';
import { NextStepsField } from '../../components/care/NextStepsField';
import { ReadingsFields } from '../../components/care/ReadingsFields';
import { TherapyChangeField } from '../../components/care/TherapyChangeField';
import { ThreadPicker } from '../../components/care/ThreadPicker';
import { useVisitClose } from './useVisitClose';

type Controller = ReturnType<typeof useVisitClose>;

/** «Cosa ha detto» il medico. */
function SaidField({ c }: { c: Controller }) {
  return (
    <Field label="Cosa ha detto">
      <textarea
        className="input"
        rows={4}
        value={c.state.text}
        onChange={(e) => c.patch({ text: e.target.value })}
      />
    </Field>
  );
}

function AttachButton({ c }: { c: Controller }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" className="btn ghost small" onClick={() => input.current?.click()}>
        📎 {c.files.length ? `${c.files.length} allegati` : 'Allega referto o ricetta'}
      </button>
      <input
        ref={input}
        type="file"
        hidden
        multiple
        accept="image/*,application/pdf"
        onChange={(e) => c.setFiles(Array.from(e.target.files ?? []))}
      />
    </>
  );
}

/** Visita conclusa (4c): il tassello del filone si compila in pochi campi, tutti facoltativi tranne il filone. */
export function CareVisitClosePage() {
  const { eventId } = useParams();
  const c = useVisitClose(eventId);

  if (c.isLoading) {
    return <div className="empty">Caricamento…</div>;
  }
  if (!c.visit || !c.currentRecipient) {
    return (
      <div className="empty">
        Nessuna persona assistita in questo spazio. <Link to="/cura/nuova">Aggiungila</Link>
      </div>
    );
  }
  const sub = [
    careName(c.currentRecipient),
    c.thread?.specialty ?? c.visit.title,
    formatNumericDate(new Date(c.visit.starts_at)),
    c.thread?.doctor ?? c.visit.contacts?.name,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="care-form">
      <div className="hstack" style={{ justifyContent: 'space-between' }}>
        <Link className="backlink" to={`/evento/${c.visit.id}`} replace>
          ‹ Annulla
        </Link>
        <button className="btn accent small" disabled={c.busy} onClick={() => void c.save()}>
          Salva
        </button>
      </div>
      <p className="muted">{sub}</p>
      <h1 className="care-name" style={{ fontSize: 26 }}>
        Com’è andata la visita?
      </h1>
      <FormError message={c.error} />
      {c.people.length > 1 && (
        <div className="chips" role="group" aria-label="Persona assistita">
          {c.people.map((p) => (
            <button
              key={p.id}
              className="chip"
              aria-pressed={p.id === c.currentRecipient?.id}
              onClick={() => c.setRecipientId(p.id)}
            >
              {careName(p)}
            </button>
          ))}
        </div>
      )}
      <ThreadPicker
        threads={c.threads}
        selectedId={c.state.threadId}
        onSelect={(threadId) => c.patch({ threadId, readings: {} })}
        onCreate={c.createThread}
      />
      <SaidField c={c} />
      <ReadingsFields
        paramKeys={c.thread?.tracked_params ?? []}
        values={c.state.readings}
        onChange={(readings) => c.patch({ readings })}
      />
      <TherapyChangeField
        meds={c.meds}
        medId={c.state.changeMedId}
        strength={c.state.newStrength}
        doseUnits={c.state.newDoseUnits}
        onChange={(p) => c.patch(p)}
      />
      <NextStepsField
        months={c.state.nextCheckMonths}
        onMonths={(nextCheckMonths) => c.patch({ nextCheckMonths })}
        followUps={c.state.followUps}
        onFollowUps={(followUps) => c.patch({ followUps })}
      />
      <AttachButton c={c} />
      <p className="care-disclaimer">
        Ohana raccoglie e mette in ordine ciò che dicono i medici: non dà indicazioni mediche.
      </p>
    </div>
  );
}
