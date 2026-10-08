import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useBack } from '../lib/nav';

/** Freccia «‹ Altro» per le sottopagine su mobile (su desktop c'è la barra laterale). */
export function BackLink({ to, label, history = false }: { to: string; label: string; history?: boolean }) {
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
