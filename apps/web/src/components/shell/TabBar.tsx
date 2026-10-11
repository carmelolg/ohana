import { Link, useLocation } from 'react-router-dom';
import { CalendarDays, Home, House, Plus, Users } from 'lucide-react';
import { areaOf, type Area } from './areas';

const TABS = [
  { area: 'oggi', to: '/oggi', label: 'Oggi', Icon: Home },
  { area: 'agenda', to: '/calendario', label: 'Agenda', Icon: CalendarDays },
  { area: 'casa', to: '/casa', label: 'Casa', Icon: House },
  { area: 'famiglia', to: '/famiglia', label: 'Famiglia', Icon: Users },
] as const satisfies readonly { area: Area; to: string; label: string; Icon: unknown }[];

/** Barra inferiore mobile: Oggi · Agenda · [+] · Casa · Famiglia. L'area attiva resta evidenziata nelle sue sottopagine. */
export function TabBar({ onCreate }: { onCreate: () => void }) {
  const active = areaOf(useLocation().pathname);
  const tab = ({ area, to, label, Icon }: (typeof TABS)[number]) => (
    <Link key={area} className="tab" to={to} aria-current={active === area ? 'page' : undefined}>
      <Icon size={22} strokeWidth={1.75} />
      {label}
    </Link>
  );
  return (
    <nav className="tabbar" aria-label="Navigazione principale">
      {TABS.slice(0, 2).map(tab)}
      <button className="tab-plus" aria-label="Crea nuovo" aria-haspopup="dialog" onClick={onCreate}>
        <Plus size={28} strokeWidth={2} />
      </button>
      {TABS.slice(2).map(tab)}
    </nav>
  );
}
