import { findMaintenanceTemplate, findProcedureTemplate, type ParsedEvent } from '@ohana/shared';
import type { Option } from './options';

/** Una voce del «+»: quelle di sistema hanno un `kind` del parser, quelle di Cura ne hanno uno proprio. */
export type RowOption = Pick<Option, 'badge' | 'title' | 'sub'> & { kind: string };

/** Nome del modello capito dal testo, per le voci che ne hanno (manutenzione, pratica). */
function templateTitle(option: RowOption, parsed: ParsedEvent | null): string | null {
  if (option.kind === 'manutenzione') {
    return findMaintenanceTemplate(parsed?.templateKey)?.title ?? null;
  }
  if (option.kind === 'pratica') {
    return findProcedureTemplate(parsed?.templateKey)?.title ?? null;
  }
  return null;
}

interface Props {
  option: RowOption;
  /** È la voce che il testo libero suggerisce. */
  recommended: boolean;
  parsed: ParsedEvent | null;
  onPick: () => void;
}

export function OptionRow({ option, recommended, parsed, onPick }: Props) {
  const template = recommended ? templateTitle(option, parsed) : null;
  return (
    <button
      role="listitem"
      type="button"
      onClick={onPick}
      aria-label={option.title}
      className={'option-row' + (recommended ? ' recommended' : '')}
    >
      <span className="option-badge">{option.badge}</span>
      <span className="option-text">
        <span className="option-title">
          {option.title}
          {recommended && (
            <span className="badge" style={{ marginLeft: 8 }}>
              CONSIGLIATO
            </span>
          )}
        </span>
        <span className="muted option-sub">{template ? `Modello: ${template}` : option.sub}</span>
      </span>
    </button>
  );
}
