import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { VisitQuestion } from '../../lib/types';

interface Props {
  questions: VisitQuestion[];
  authorName: (id: string) => string;
  me: string;
  isAdmin: boolean;
  canWrite: boolean;
  onAdd: (text: string) => Promise<void>;
  onToggle: (q: VisitQuestion) => void;
  onRemove: (q: VisitQuestion) => void;
}

/** Domande da fare al medico: le aggiunge chiunque nello spazio, anche chi non accompagna. */
export function QuestionList({
  questions,
  authorName,
  me,
  isAdmin,
  canWrite,
  onAdd,
  onToggle,
  onRemove,
}: Props) {
  const [text, setText] = useState('');
  const submit = async () => {
    if (text.trim()) {
      await onAdd(text);
      setText('');
    }
  };
  return (
    <div>
      {questions.map((q) => (
        <div key={q.id} className={'prep-q' + (q.done ? ' done' : '')}>
          <button
            type="button"
            role="checkbox"
            aria-checked={q.done}
            aria-label={`Fatta: ${q.text}`}
            className={'dose-box' + (q.done ? ' on' : '')}
            disabled={!canWrite}
            onClick={() => onToggle(q)}
          >
            {q.done ? '✓' : ''}
          </button>
          <span className="text">
            {q.text}
            {q.author_id !== me && <span className="muted"> · {authorName(q.author_id)}</span>}
          </span>
          {canWrite && (q.author_id === me || isAdmin) && (
            <button
              type="button"
              className="icon-btn"
              aria-label={`Elimina la domanda: ${q.text}`}
              onClick={() => onRemove(q)}
            >
              <Trash2 size={16} />
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
            void submit();
          }}
        >
          <input
            className="input"
            aria-label="Nuova domanda"
            placeholder="+ Aggiungi domanda (anche i fratelli possono)"
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
