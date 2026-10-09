import { Link } from 'react-router-dom';
import type { CareTodo } from '@ohana/shared';

const OVERDUE_CLASS = 'tl-type';

/** «Da fare»: ricette, piani in scadenza e prossimi passi di una persona. */
export function TodoList({ todos, to }: { todos: CareTodo[]; to: string }) {
  if (todos.length === 0) {
    return <p className="muted">Niente da fare per ora.</p>;
  }
  return (
    <ul className="care-todo" aria-label="Da fare">
      {todos.map((t) => (
        <li key={t.key}>
          <Link className="since-row" to={to}>
            <span style={{ flex: 1 }}>
              {t.title}
              <span className="muted"> · {t.detail}</span>
            </span>
            {t.daysLeft !== null && t.daysLeft < 0 && <span className={OVERDUE_CLASS}>scaduto</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
