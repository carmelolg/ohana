import { ChevronDown, ChevronUp } from 'lucide-react';
import { formatDay, formatTime } from '@ohana/shared';
import { CheckButton } from '../../components/CheckButton';
import type { ProcedureStep } from '../../lib/types';

interface Props {
  steps: ProcedureStep[];
  /** Data degli impegni collegati ai passaggi, per id impegno. */
  eventDates: Map<string, string>;
  writable: boolean;
  onToggle: (step: ProcedureStep) => void;
  onOpen: (step: ProcedureStep) => void;
  /** Sposta un passaggio di un posto (-1 su, +1 giù). */
  onMove: (step: ProcedureStep, delta: number) => void;
}

/** Passaggi della pratica: casella per completarli, tocco sul titolo per i dettagli. */
export function StepList({ steps, eventDates, writable, onToggle, onOpen, onMove }: Props) {
  const current = steps.findIndex((s) => !s.done_at);
  return (
    <div className="card step-list">
      {steps.map((s, i) => {
        const startsAt = s.event_id ? eventDates.get(s.event_id) : undefined;
        return (
          <div key={s.id} className="step-row">
            <CheckButton
              checked={!!s.done_at}
              label={s.title}
              disabled={!writable}
              emphasis={i === current}
              onToggle={() => onToggle(s)}
              style={{ margin: '0 -8px 0 -12px' }}
            />
            <button className="step-open" onClick={() => onOpen(s)} aria-label={`Dettagli: ${s.title}`}>
              <span className={'proc-step-title' + (s.done_at ? ' done' : '')}>{s.title}</span>
              {i === current && <span className="step-next">Prossimo passo</span>}
              {(startsAt || s.note) && (
                <span className={'step-when' + (startsAt && !s.done_at ? ' upcoming' : '')}>
                  {startsAt
                    ? `${formatDay(new Date(startsAt))} · ${formatTime(new Date(startsAt))} · è nel calendario`
                    : s.note}
                </span>
              )}
            </button>
            {writable && steps.length > 1 && (
              <div className="step-move">
                <button aria-label={`Sposta su: ${s.title}`} disabled={i === 0} onClick={() => onMove(s, -1)}>
                  <ChevronUp size={18} />
                </button>
                <button
                  aria-label={`Sposta giù: ${s.title}`}
                  disabled={i === steps.length - 1}
                  onClick={() => onMove(s, 1)}
                >
                  <ChevronDown size={18} />
                </button>
              </div>
            )}
          </div>
        );
      })}
      {steps.length === 0 && (
        <p className="muted" style={{ padding: '12px 0' }}>
          Nessun passaggio.
        </p>
      )}
    </div>
  );
}
