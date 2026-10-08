import { Link, NavLink, useLocation } from 'react-router-dom';
import { useFeature } from '../../lib/data';
import { CalendarDays, Home, MoreHorizontal, Plus, ShoppingBasket } from 'lucide-react';

const MORE_PATHS = ['/altro', '/rubrica', '/spese', '/impostazioni', '/spazio'];

/** «Altro» resta evidenziato anche nelle pagine che contiene (Rubrica, Spese, Impostazioni…): si capisce dove si è. */
export const isInMore = (pathname: string): boolean =>
  MORE_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));

/** Barra inferiore mobile: Oggi · Calendario · [+] · Spesa · Altro. */
export function TabBar({ onCreate }: { onCreate: () => void }) {
  const { pathname } = useLocation();
  const hasShopping = useFeature('spesa');
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
      {hasShopping && (
        <NavLink className="tab" to="/spesa">
          <ShoppingBasket size={22} strokeWidth={1.75} />
          Spesa
        </NavLink>
      )}
      <Link className="tab" to="/altro" aria-current={isInMore(pathname) ? 'page' : undefined}>
        <MoreHorizontal size={22} strokeWidth={1.75} />
        Altro
      </Link>
    </nav>
  );
}
