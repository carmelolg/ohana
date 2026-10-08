import { Mic } from 'lucide-react';

interface Props {
  text: string;
  listening: boolean;
  onChange: (text: string) => void;
  onSubmit: () => void;
  onToggleVoice: () => void;
}

/** Campo di testo libero con il pulsante per dettare. */
export function PromptBar({ text, listening, onChange, onSubmit, onToggleVoice }: Props) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      style={{
        height: 52,
        borderRadius: 26,
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px 0 18px',
        gap: 10,
        marginBottom: 8,
      }}
    >
      <label className="sr-only" htmlFor="new-text">
        Scrivi o detta cosa vuoi creare
      </label>
      <input
        id="new-text"
        autoFocus
        autoComplete="off"
        placeholder={'Scrivi o detta… es. "caldaia ogni anno a novembre"'}
        value={text}
        onChange={(e) => onChange(e.target.value)}
        style={{ flex: 1, minWidth: 0, border: 0, background: 'transparent', outline: 'none', fontSize: 15 }}
      />
      <button
        type="button"
        className={'mic' + (listening ? ' on' : '')}
        style={{ width: 38, height: 38 }}
        aria-label={listening ? 'Ferma dettatura' : 'Detta'}
        aria-pressed={listening}
        onClick={onToggleVoice}
      >
        <Mic size={18} strokeWidth={1.75} />
      </button>
    </form>
  );
}
