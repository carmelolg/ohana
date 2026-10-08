import { useState } from 'react';
import { Plus } from 'lucide-react';

/** Campo «Aggiungi un passaggio» in fondo alla lista. */
export function AddStepForm({ onAdd }: { onAdd: (title: string) => void }) {
  const [title, setTitle] = useState('');
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      return;
    }
    onAdd(title.trim());
    setTitle('');
  };
  return (
    <form className="hstack" style={{ marginTop: 10 }} onSubmit={submit}>
      <input
        className="input"
        aria-label="Nuovo passaggio"
        placeholder="Aggiungi un passaggio"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <button className="btn small" type="submit" disabled={!title.trim()} aria-label="Aggiungi passaggio">
        <Plus size={18} />
      </button>
    </form>
  );
}
