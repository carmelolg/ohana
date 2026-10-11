import { Check } from 'lucide-react';
import type { ProcedureStep } from '../../lib/types';
import { advanceLabel, nextStep } from './phases';

interface Props {
  steps: ProcedureStep[];
  onAdvance: (step: ProcedureStep) => void;
}

/** Un solo pulsante «Segna fatto: <fase successiva>» che fa avanzare la pratica. */
export function AdvanceButton({ steps, onAdvance }: Props) {
  const next = nextStep(steps);
  if (!next) {
    return null;
  }
  return (
    <button className="btn ok lg advance" onClick={() => onAdvance(next)}>
      <Check size={20} strokeWidth={2.5} />
      {advanceLabel(steps)}
    </button>
  );
}
