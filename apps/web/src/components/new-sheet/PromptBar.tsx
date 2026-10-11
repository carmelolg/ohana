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
      className="prompt-bar"
    >
      <label className="sr-only" htmlFor="new-text">
        Scrivi o detta cosa vuoi creare
      </label>
      <input
        id="new-text"
        autoFocus
        autoComplete="off"
        className="prompt-input"
        placeholder={'Scrivi o detta… es. "caldaia ogni anno a novembre"'}
        value={text}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        className={'mic prompt-mic' + (listening ? ' on' : '')}
        aria-label={listening ? 'Ferma dettatura' : 'Detta'}
        aria-pressed={listening}
        onClick={onToggleVoice}
      >
        <Mic size={18} strokeWidth={1.75} />
      </button>
    </form>
  );
}
