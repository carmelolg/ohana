import { Trash2 } from 'lucide-react';
import type { Category } from '../../lib/types';
import { parseKeywords, sameKeywords } from './keywords';

interface Props {
  category: Category;
  writable: boolean;
  onRename: (name: string) => void;
  onKeywords: (keywords: string[]) => void;
  onDelete: () => void;
}

/** Una categoria: nome (rinominabile), parole chiave per l'aggiunta rapida, eliminazione per quelle personalizzate. */
export function CategoryRow({ category: c, writable, onRename, onKeywords, onDelete }: Props) {
  return (
    <div className="cat-row">
      <div className="hstack">
        <input
          className="input"
          aria-label={`Nome categoria ${c.name}`}
          defaultValue={c.name}
          disabled={!writable}
          onBlur={(e) => {
            const name = e.target.value.trim();
            if (name && name !== c.name) {
              onRename(name);
            }
          }}
        />
        {c.slug ? (
          <span className="label" style={{ whiteSpace: 'nowrap' }}>
            Predefinita
          </span>
        ) : (
          writable && (
            <button className="icon-btn" aria-label={`Elimina ${c.name}`} onClick={onDelete}>
              <Trash2 size={18} />
            </button>
          )
        )}
      </div>
      {c.slug !== 'altro' && (
        <input
          className="input"
          style={{ minHeight: 40, fontSize: 14 }}
          aria-label={`Parole chiave di ${c.name}`}
          placeholder="Parole chiave, separate da virgola"
          defaultValue={c.keywords.join(', ')}
          disabled={!writable}
          onBlur={(e) => {
            const keywords = parseKeywords(e.target.value);
            if (!sameKeywords(keywords, c.keywords)) {
              onKeywords(keywords);
            }
          }}
        />
      )}
    </div>
  );
}
