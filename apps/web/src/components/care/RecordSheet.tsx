import { useState } from 'react';
import { CARE_PARAMS, parseCareNumber, parsePressure, readingInfo } from '@ohana/shared';
import { Field } from '../Field';
import { Sheet } from '../ui';
import { recordEpisode, recordMeasurement } from '../../lib/api/measurements';
import { useMutate } from '../../lib/data';
import { useToast } from '../../lib/toast';
import type { CareRecipient, CareThread } from '../../lib/types';
import { quickActions, type QuickAction } from './quickActions';

interface Props {
  recipient: CareRecipient;
  threads: CareThread[];
  /** Azione già scelta (dalla pagina dei parametri); senza, si sceglie dall'elenco. */
  action?: QuickAction;
  onClose: () => void;
}

function MeasureForm({
  action,
  recipient,
  onDone,
}: {
  action: Extract<QuickAction, { kind: 'measure' }>;
  recipient: CareRecipient;
  onDone: () => void;
}) {
  const mutate = useMutate();
  const toast = useToast();
  const [high, setHigh] = useState('');
  const [low, setLow] = useState('');
  const [error, setError] = useState('');
  const pressure = action.param === 'blood_pressure';

  async function save() {
    const a = parseCareNumber(high);
    const b = pressure ? parseCareNumber(low) : null;
    if (a === null || (pressure && b === null)) {
      return setError(pressure ? 'Scrivi massima e minima, ad esempio 130 e 80' : 'Scrivi un numero');
    }
    try {
      await recordMeasurement(mutate, {
        spaceId: recipient.space_id,
        recipientId: recipient.id,
        threadId: action.threadId,
        type: action.param,
        value: a,
        value2: b,
        at: new Date(),
      });
      toast('Registrato');
      onDone();
    } catch {
      setError('Non riesco a salvare. Riprova.');
    }
  }

  return (
    <div className="care-form">
      <Field
        label={
          pressure
            ? 'Massima (sistolica)'
            : `${CARE_PARAMS[action.param].label} (${CARE_PARAMS[action.param].unit})`
        }
      >
        <input
          className="input"
          inputMode="decimal"
          autoFocus
          value={high}
          onChange={(e) => setHigh(e.target.value)}
        />
      </Field>
      {pressure && (
        <Field label="Minima (diastolica)">
          <input className="input" inputMode="decimal" value={low} onChange={(e) => setLow(e.target.value)} />
        </Field>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button className="btn accent" onClick={() => void save()}>
        Registra ora
      </button>
    </div>
  );
}

function EpisodeForm({
  action,
  thread,
  recipient,
  onDone,
}: {
  action: Extract<QuickAction, { kind: 'episode' }>;
  thread: CareThread;
  recipient: CareRecipient;
  onDone: () => void;
}) {
  const mutate = useMutate();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  async function save() {
    const readings: Record<string, unknown> = {};
    for (const [key, raw] of Object.entries(values)) {
      const parsed =
        key === 'blood_pressure' ? (parsePressure(raw) ? raw.trim() : null) : parseCareNumber(raw);
      if (parsed !== null && raw.trim()) {
        readings[key] = parsed;
      }
    }
    try {
      await recordEpisode(mutate, {
        spaceId: recipient.space_id,
        recipientId: recipient.id,
        threadId: action.threadId,
        title: title.trim() || action.title,
        text,
        readings,
        at: new Date(),
      });
      toast('Episodio registrato');
      onDone();
    } catch {
      setError('Non riesco a salvare. Riprova.');
    }
  }

  return (
    <div className="care-form">
      <Field label="Cosa è successo">
        <input
          className="input"
          autoFocus
          placeholder={action.title}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </Field>
      <Field label="Durata e dettagli">
        <textarea
          className="input"
          rows={2}
          placeholder="Circa 20 minuti dopo cena"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </Field>
      {thread.tracked_params.map((key) => (
        <Field key={key} label={`${readingInfo(key).label} (facoltativo)`}>
          <input
            className="input"
            inputMode={key === 'blood_pressure' ? 'text' : 'decimal'}
            value={values[key] ?? ''}
            onChange={(e) => setValues({ ...values, [key]: e.target.value })}
          />
        </Field>
      ))}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button className="btn accent" onClick={() => void save()}>
        Registra
      </button>
    </div>
  );
}

/** Registrare un parametro o un episodio: al massimo due tocchi dal «+» (scelta dell'azione, poi il valore). */
export function RecordSheet({ recipient, threads, action, onClose }: Props) {
  const [picked, setPicked] = useState<QuickAction | undefined>(action);
  const name = recipient.label ?? recipient.first_name;
  const thread = picked?.kind === 'episode' ? threads.find((t) => t.id === picked.threadId) : undefined;
  return (
    <Sheet onClose={onClose} label={`Registra per ${name}`}>
      <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>
        {picked ? picked.label : `Registra per ${name}`}
      </h2>
      {!picked && (
        <div className="quick-grid">
          {quickActions(threads).map((a) => (
            <button key={a.id} type="button" onClick={() => setPicked(a)}>
              {a.label}
            </button>
          ))}
        </div>
      )}
      {picked?.kind === 'measure' && <MeasureForm action={picked} recipient={recipient} onDone={onClose} />}
      {picked?.kind === 'episode' && thread && (
        <EpisodeForm action={picked} thread={thread} recipient={recipient} onDone={onClose} />
      )}
    </Sheet>
  );
}
