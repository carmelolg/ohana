import { useLayoutEffect, useRef } from 'react';
import { Lock } from 'lucide-react';
import type { Token } from '@ohana/shared';

/** Il testo con i frammenti riconosciuti (data, ora, @nome…) evidenziati sotto la textarea. */
function Highlighted({ text, tokens }: { text: string; tokens: Token[] }) {
  const out: React.ReactNode[] = [];
  let pos = 0;
  tokens
    .filter((t) => t.kind !== 'category' && t.kind !== 'contact')
    .forEach((t, i) => {
      if (t.start < pos) {
        return;
      }
      out.push(text.slice(pos, t.start));
      out.push(
        <mark key={i} className={t.kind}>
          {text.slice(t.start, t.end)}
        </mark>,
      );
      pos = t.end;
    });
  out.push(text.slice(pos) + '\n');
  return (
    <div className="quick-hl" aria-hidden>
      {out}
    </div>
  );
}

interface QuickTextProps {
  text: string;
  tokens: Token[] | null;
  isNew: boolean;
  isChore: boolean;
  readOnly: boolean;
  /** Perché il titolo non si può cambiare (es. «Dal calendario»): lo mostra accanto al lucchetto. */
  lockedNote?: string;
  /** Il titolo manca: il campo si evidenzia in rosso. */
  invalid?: boolean;
  onChange: (text: string) => void;
}

/** La textarea cresce con il testo: niente righe vuote sotto un titolo corto. */
function useAutoHeight(text: string) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [text]);
  return ref;
}

/**
 * Campo di testo libero. Nuovo: scrittura libera con evidenziazione di ciò che l'app ha capito. In modifica: un campo
 * «Titolo» con bordo, così si vede dove inizia e finisce; se è del calendario d'origine è bloccato e lo dice.
 */
export function QuickText({
  text,
  tokens,
  isNew,
  isChore,
  readOnly,
  lockedNote,
  invalid,
  onChange,
}: QuickTextProps) {
  const ref = useAutoHeight(text);
  const placeholder = !isNew
    ? 'Titolo'
    : isChore
      ? 'Es. Plastica fuori ogni giovedì @Francesca'
      : 'Es. Visita oculista mamma giovedì alle 10:30 #mamma @luca ricordamelo 2 giorni prima';
  return (
    <div className={`quick-wrap${isNew ? '' : ' title-field'}${lockedNote ? ' locked' : ''}`}>
      {!isNew && (
        <div className="title-meta">
          <label className="label" htmlFor="event-title">
            Titolo
          </label>
          {lockedNote && (
            <span className="title-lock">
              <Lock size={12} aria-hidden /> {lockedNote}
            </span>
          )}
        </div>
      )}
      {tokens && <Highlighted text={text} tokens={tokens} />}
      <textarea
        ref={ref}
        id={isNew ? undefined : 'event-title'}
        className="quick-ta"
        autoFocus={isNew}
        aria-label={isNew ? 'Descrivi l’impegno' : 'Titolo'}
        placeholder={placeholder}
        rows={1}
        value={text}
        readOnly={readOnly}
        aria-invalid={invalid || undefined}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
