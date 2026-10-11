import { Link } from 'react-router-dom';

interface Props {
  to: string;
  title: string;
  sub: string;
  state?: string;
  danger?: boolean;
}

/** Card d'accesso di Casa e Famiglia: titolo, descrizione e badge di stato già visibile. */
export function AreaCard({ to, title, sub, state, danger }: Props) {
  return (
    <Link
      to={to}
      className={'more-card' + (danger ? ' danger' : '')}
      aria-label={`${title}${state ? ', ' + state : ''}`}
    >
      <span className="more-card-title">{title}</span>
      <span className="muted more-card-sub">{sub}</span>
      {state && <span className="more-card-state">{state}</span>}
    </Link>
  );
}
