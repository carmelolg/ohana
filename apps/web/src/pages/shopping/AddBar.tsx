import { useState } from 'react';
import { Plus } from 'lucide-react';

/** Barra in fondo alla lista: scrivi una o più voci separate da virgola. */
export function AddBar({ onAdd }: { onAdd: (text: string) => void }) {
  const [text, setText] = useState('');
  return (
    <form
      className="addbar"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) {
          onAdd(text);
          setText('');
        }
      }}
    >
      <input
        className="input"
        placeholder="latte, 2 pane, uova x6…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label="Aggiungi alla spesa"
      />
      <button className="btn accent" type="submit" aria-label="Aggiungi" disabled={!text.trim()}>
        <Plus size={20} />
      </button>
    </form>
  );
}
