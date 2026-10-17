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
    <div className="card" style={{ marginTop: 18, padding: '4px 16px' }}>
      {steps.map((s, i) => {
        const startsAt = s.event_id ? eventDates.get(s.event_id) : undefined;
        return (
          <div
            key={s.id}
            style={{
              display: 'flex',
              gap: 6,
              padding: '4px 0',
              borderBottom: i < steps.length - 1 ? '1px solid var(--line)' : 0,
              alignItems: 'flex-start',
            }}
          >
            <CheckButton
              checked={!!s.done_at}
              label={s.title}
              disabled={!writable}
              emphasis={i === current}
              onToggle={() => onToggle(s)}
              style={{ margin: '0 -8px 0 -12px' }}
            />
            <button
              onClick={() => onOpen(s)}
              style={{
                flex: 1,
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                padding: '10px 0',
                minHeight: 44,
              }}
              aria-label={`Dettagli: ${s.title}`}
            >
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: s.done_at ? 'var(--text-2)' : undefined,
                  textDecoration: s.done_at ? 'line-through' : 'none',
                }}
              >
                {s.title}
              </span>
              {i === current && <span className="step-next">Prossimo passo</span>}
              {(startsAt || s.note) && (
                <span
                  style={{
                    fontSize: 13,
                    color: startsAt && !s.done_at ? 'var(--accent-ink)' : 'var(--text-2)',
                  }}
                >
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
