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
  /** Il titolo manca: il campo si evidenzia in rosso. */
  invalid?: boolean;
  onChange: (text: string) => void;
}

/** Campo di testo libero con evidenziazione di ciò che l'app ha capito. */
export function QuickText({ text, tokens, isNew, isChore, readOnly, invalid, onChange }: QuickTextProps) {
  const placeholder = !isNew
    ? 'Titolo'
    : isChore
      ? 'Es. Plastica fuori ogni giovedì @Francesca'
      : 'Es. Visita oculista mamma giovedì alle 10:30 #mamma @luca ricordamelo 2 giorni prima';
  return (
    <div className="quick-wrap">
      {tokens && <Highlighted text={text} tokens={tokens} />}
      <textarea
        className="quick-ta"
        autoFocus={isNew}
        aria-label={isNew ? 'Descrivi l’impegno' : 'Titolo'}
        placeholder={placeholder}
        rows={Math.max(3, Math.ceil(text.length / 28))}
        value={text}
        readOnly={readOnly}
        aria-invalid={invalid || undefined}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
