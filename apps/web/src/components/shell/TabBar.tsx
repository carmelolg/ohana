import { Link, NavLink, useLocation } from 'react-router-dom';
import { useFeatures } from '../../lib/data';
import { CalendarDays, Home, MoreHorizontal, Plus } from 'lucide-react';
import { pickTabShortcut } from './tabShortcut';

const MORE_PATHS = ['/altro', '/rubrica', '/spese', '/impostazioni', '/spazio'];

/**
 * «Altro» resta evidenziato anche nelle pagine che contiene (Rubrica, Spese, Impostazioni…): si capisce dove si è.
 * Una pagina che in quel momento ha già la sua scheda nella barra (`shortcutPath`) non evidenzia anche «Altro».
 */
export const isInMore = (pathname: string, shortcutPath?: string): boolean =>
  MORE_PATHS.filter((p) => p !== shortcutPath).some((p) => pathname === p || pathname.startsWith(p + '/'));

/** Barra inferiore mobile: Oggi · Calendario · [+] · Spesa (o la prima funzione accesa) · Altro. */
export function TabBar({ onCreate }: { onCreate: () => void }) {
  const { pathname } = useLocation();
  const shortcut = pickTabShortcut(useFeatures());
  return (
    <nav className="tabbar" aria-label="Navigazione principale">
      <NavLink className="tab" to="/oggi">
        <Home size={22} strokeWidth={1.75} />
        Oggi
      </NavLink>
      <NavLink className="tab" to="/calendario">
        <CalendarDays size={22} strokeWidth={1.75} />
        Calendario
      </NavLink>
      <button className="tab-plus" aria-label="Crea nuovo" aria-haspopup="dialog" onClick={onCreate}>
        <Plus size={28} strokeWidth={2} />
      </button>
      <NavLink className="tab" to={shortcut.to}>
        <shortcut.Icon size={22} strokeWidth={1.75} />
        {shortcut.label}
      </NavLink>
      <Link className="tab" to="/altro" aria-current={isInMore(pathname, shortcut.to) ? 'page' : undefined}>
        <MoreHorizontal size={22} strokeWidth={1.75} />
        Altro
      </Link>
    </nav>
  );
}
