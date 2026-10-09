import { useState } from 'react';
import { X } from 'lucide-react';

type Item = { text: string; done: boolean };

/** Cose da portare alla visita: tessera sanitaria, esami, elenco terapie… */
export function BringList({
  items,
  canWrite,
  onChange,
}: {
  items: Item[];
  canWrite: boolean;
  onChange: (next: Item[]) => void;
}) {
  const [text, setText] = useState('');
  return (
    <div>
      {items.map((item, i) => (
        <div key={i} className={'prep-q' + (item.done ? ' done' : '')}>
          <button
            type="button"
            role="checkbox"
            aria-checked={item.done}
            aria-label={`Preso: ${item.text}`}
            className={'dose-box' + (item.done ? ' on' : '')}
            disabled={!canWrite}
            onClick={() => onChange(items.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))}
          >
            {item.done ? '✓' : ''}
          </button>
          <span className="text">{item.text}</span>
          {canWrite && (
            <button
              type="button"
              className="icon-btn"
              aria-label={`Togli: ${item.text}`}
              onClick={() => onChange(items.filter((_, j) => j !== i))}
            >
              <X size={16} />
            </button>
          )}
        </div>
      ))}
      {canWrite && (
        <form
          className="hstack"
          style={{ marginTop: 10 }}
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) {
              onChange([...items, { text: text.trim(), done: false }]);
              setText('');
            }
          }}
        >
          <input
            className="input"
            aria-label="Cosa portare"
            placeholder="+ Aggiungi"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button className="btn small" type="submit" disabled={!text.trim()}>
            Aggiungi
          </button>
        </form>
      )}
    </div>
  );
}
