import { useState } from 'react';

interface Props {
  onAdd: (name: string, keywords: string) => void;
}

/** Nome e parole chiave di una nuova categoria personalizzata. */
export function NewCategoryForm({ onAdd }: Props) {
  const [name, setName] = useState('');
  const [keywords, setKeywords] = useState('');
  return (
    <form
      className="stack"
      style={{ marginTop: 12 }}
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) {
          onAdd(name.trim(), keywords);
          setName('');
          setKeywords('');
        }
      }}
    >
      <input
        className="input"
        placeholder="Nuova categoria (es. Animali)"
        aria-label="Nome nuova categoria"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        className="input"
        placeholder="Parole chiave (es. veterinario, cane, gatto)"
        aria-label="Parole chiave nuova categoria"
        value={keywords}
        onChange={(e) => setKeywords(e.target.value)}
      />
      <button className="btn small" type="submit" disabled={!name.trim()}>
        Aggiungi categoria
      </button>
    </form>
  );
}
