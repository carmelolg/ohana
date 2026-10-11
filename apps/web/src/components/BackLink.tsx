import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useBack } from '../lib/nav';

interface BackLinkProps {
  to: string;
  label: string;
  history?: boolean;
}

/** Freccia «‹ Casa» / «‹ Famiglia» per tornare dalla sottopagina alla funzione principale, su mobile e su desktop. */
export function BackLink({ to, label, history = false }: BackLinkProps) {
  const back = useBack(to);
  const content = (
    <>
      <ChevronLeft size={20} strokeWidth={1.75} />
      {label}
    </>
  );
  return history ? (
    <button type="button" className="backlink" onClick={back}>
      {content}
    </button>
  ) : (
    <Link className="backlink" to={to}>
      {content}
    </Link>
  );
}
