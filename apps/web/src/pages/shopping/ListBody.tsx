import { Trash2 } from 'lucide-react';
import type { ShoppingItem } from '../../lib/types';
import { AddBar } from './AddBar';
import { groupByCategory } from './grouping';
import { ShoppingItemRow } from './ShoppingItemRow';

interface Props {
  todo: ShoppingItem[];
  done: ShoppingItem[];
  writable: boolean;
  onToggle: (item: ShoppingItem) => void;
  onAdd: (text: string) => void;
  onClearChecked: () => void;
  onDeleteList: () => void;
}

/** Il contenuto di una lista: voci per reparto, carrello, barra di aggiunta ed eliminazione. */
export function ListBody({ todo, done, writable, onToggle, onAdd, onClearChecked, onDeleteList }: Props) {
  return (
    <>
      <div className="list" style={{ marginTop: 8 }}>
        {groupByCategory(todo).map(([category, rows]) => (
          <div key={category}>
            <div className="label section-label">{category}</div>
            {rows.map((it) => (
              <ShoppingItemRow key={it.id} item={it} onToggle={onToggle} />
            ))}
          </div>
        ))}
        {todo.length === 0 && (
          <div className="empty">Lista vuota. Scrivi sotto, anche più voci separate da virgola.</div>
        )}
      </div>
      {done.length > 0 && (
        <>
          <div className="hstack" style={{ justifyContent: 'space-between' }}>
            <div className="label section-label">Nel carrello · {done.length}</div>
            {writable && (
              <button className="btn ghost small" onClick={onClearChecked}>
                <Trash2 size={16} /> Svuota
              </button>
            )}
          </div>
          {done.map((it) => (
            <ShoppingItemRow key={it.id} item={it} onToggle={onToggle} />
          ))}
        </>
      )}
      {writable && <AddBar onAdd={onAdd} />}
      {writable && (
        <button className="btn ghost small" style={{ marginTop: 16 }} onClick={onDeleteList}>
          Elimina lista
        </button>
      )}
    </>
  );
}
