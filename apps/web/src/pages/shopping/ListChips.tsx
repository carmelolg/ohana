import { useState } from 'react';
import { Plus } from 'lucide-react';
import { spaceColor } from '../../lib/color';
import type { ShoppingItem, ShoppingList, Space } from '../../lib/types';

interface Props {
  lists: ShoppingList[];
  items: ShoppingItem[];
  activeId: string | undefined;
  showSpaceDot: boolean;
  spaceById: (id: string) => Space | undefined;
  canAdd: boolean;
  /** Mostra il campo per creare una lista (anche dal pulsante «Crea la prima lista»). */
  adding: boolean;
  onAdding: (v: boolean) => void;
  onPick: (id: string) => void;
  onCreate: (name: string) => void;
}

function NewListForm({ onCreate }: { onCreate: (name: string) => void }) {
  const [name, setName] = useState('');
  return (
    <form
      className="hstack"
      style={{ marginTop: 12 }}
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) {
          onCreate(name.trim());
          setName('');
        }
      }}
    >
      <input
        className="input"
        autoFocus
        placeholder="Nome lista (es. Supermercato)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        aria-label="Nome lista"
      />
      <button className="btn small" type="submit">
        Crea
      </button>
    </form>
  );
}

/** Le liste come chip (con il numero di voci da comprare) e il campo per aggiungerne una. */
export function ListChips(p: Props) {
  return (
    <>
      <div className="chips" style={{ padding: '10px 0 0' }} role="group" aria-label="Liste">
        {p.lists.map((l) => (
          <button
            key={l.id}
            className="chip"
            aria-pressed={l.id === p.activeId}
            onClick={() => p.onPick(l.id)}
          >
            {p.showSpaceDot && (
              <span className="dot" style={{ background: spaceColor(p.spaceById(l.space_id)?.color_hue) }} />
            )}
            {l.name}
            <span className="mono muted">
              {p.items.filter((i) => i.list_id === l.id && !i.checked).length}
            </span>
          </button>
        ))}
        {p.canAdd && (
          <button className="chip" onClick={() => p.onAdding(true)}>
            <Plus size={14} /> Lista
          </button>
        )}
      </div>
      {p.adding && <NewListForm onCreate={p.onCreate} />}
    </>
  );
}
