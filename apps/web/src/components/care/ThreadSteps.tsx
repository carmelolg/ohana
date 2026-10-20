import { Link } from 'react-router-dom';
import type { VisitStep } from '@ohana/shared';
import { eventTextFor } from '../visit-diary/FollowUps';

interface Props {
  threadId: string;
  steps: VisitStep[];
  canWrite: boolean;
}

/** Prossimi passi del diario delle visite del filone, ancora da fissare: si trasformano in impegno del filone. */
export function ThreadSteps({ threadId, steps, canWrite }: Props) {
  if (steps.length === 0) {
    return null;
  }
  return (
    <section aria-label="Prossimi passi" className="card" style={{ padding: '4px 16px', marginBottom: 16 }}>
      <div className="label" style={{ margin: '12px 0 4px' }}>
        Prossimi passi
      </div>
      {steps.map((step) => (
        <div
          key={step.id}
          className="hstack"
          style={{ justifyContent: 'space-between', padding: '10px 0', gap: 8 }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{step.title}</div>
            {(step.due_hint ?? step.due_date) && (
              <div className="muted" style={{ fontSize: 13 }}>
                {step.due_hint ?? step.due_date}
              </div>
            )}
          </div>
          {canWrite && (
            <Link
              className="pill"
              style={{ background: 'var(--bg)', textDecoration: 'none', color: 'var(--accent-ink)' }}
              aria-label={`Crea impegno: ${step.title}`}
              to={`/nuovo?${new URLSearchParams({ text: eventTextFor(step), followup: step.id, filone: threadId })}`}
            >
              Crea impegno
            </Link>
          )}
        </div>
      ))}
    </section>
  );
}
