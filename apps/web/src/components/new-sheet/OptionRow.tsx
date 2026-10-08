import { findMaintenanceTemplate, findProcedureTemplate, type ParsedEvent } from '@ohana/shared';
import type { Option } from './options';

/** Nome del modello capito dal testo, per le voci che ne hanno (manutenzione, pratica). */
function templateTitle(option: Option, parsed: ParsedEvent | null): string | null {
  if (option.kind === 'manutenzione') {
    return findMaintenanceTemplate(parsed?.templateKey)?.title ?? null;
  }
  if (option.kind === 'pratica') {
    return findProcedureTemplate(parsed?.templateKey)?.title ?? null;
  }
  return null;
}

interface Props {
  option: Option;
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
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '13px 4px',
        borderBottom: '1px solid var(--line)',
        width: '100%',
        textAlign: 'left',
        minHeight: 64,
        background: recommended ? 'var(--accent-soft)' : undefined,
        borderRadius: recommended ? 12 : 0,
      }}
    >
      <span
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: 'var(--bg)',
          display: 'grid',
          placeItems: 'center',
          font: '600 13px var(--mono)',
          flex: 'none',
        }}
      >
        {option.badge}
      </span>
      <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
        <span style={{ fontSize: 16, fontWeight: 600 }}>
          {option.title}
          {recommended && (
            <span className="badge" style={{ marginLeft: 8 }}>
              CONSIGLIATO
            </span>
          )}
        </span>
        <span className="muted" style={{ fontSize: 13 }}>
          {template ? `Modello: ${template}` : option.sub}
        </span>
      </span>
    </button>
  );
}
