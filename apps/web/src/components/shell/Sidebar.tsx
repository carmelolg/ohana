import { NavLink } from 'react-router-dom';
import {
  BookUser,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  FileText,
  HeartPulse,
  Home,
  House,
  Pin,
  Settings as Cog,
  UserRound,
  ShoppingBasket,
  Siren,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import type { SpaceFeature } from '@ohana/shared';
import { useFeatures, useScopedRecipients, useSpace } from '../../lib/data';
import { careName } from '@ohana/shared';
import { SideGroup } from './SideGroup';
import { useSideOpen } from './useSideOpen';

export interface SideLink {
  to: string;
  label: string;
  Icon: LucideIcon;
  feature?: SpaceFeature;
}

/** Le aree con le loro sottovoci: la sottovoce segue la stessa regola di `FeatureGate`. */
const GROUPS: { head: SideLink; items: SideLink[] }[] = [
  { head: { to: '/oggi', label: 'Oggi', Icon: Home }, items: [] },
  { head: { to: '/calendario', label: 'Agenda', Icon: CalendarDays }, items: [] },
  {
    head: { to: '/casa', label: 'Casa', Icon: House },
    items: [
      { to: '/spesa', label: 'Spesa', Icon: ShoppingBasket, feature: 'spesa' },
      { to: '/spese', label: 'Spese', Icon: Wallet, feature: 'spese' },
      { to: '/scadenze', label: 'Scadenze', Icon: CalendarClock },
      { to: '/manutenzioni', label: 'Manutenzioni', Icon: Wrench, feature: 'manutenzioni' },
      { to: '/documenti', label: 'Documenti', Icon: FileText, feature: 'documenti' },
      { to: '/pratiche', label: 'Pratiche', Icon: ClipboardList, feature: 'pratiche' },
    ],
  },
  {
    head: { to: '/famiglia', label: 'Famiglia', Icon: Users },
    items: [
      { to: '/cura', label: 'Cura', Icon: HeartPulse, feature: 'cura' },
      { to: '/bacheca', label: 'Bacheca', Icon: Pin },
      { to: '/rubrica', label: 'Rubrica', Icon: BookUser },
      { to: '/emergenza', label: 'Emergenza', Icon: Siren },
    ],
  },
];

/** Collegamento alle impostazioni dello spazio attivo; lo spazio si cambia solo dalla barra superiore. */
function SpaceSettingsLink() {
  const { current } = useSpace();
  if (!current) {
    return null;
  }
  return (
    <>
      <div className="label side-sep">Spazio «{current.name}»</div>
      <NavLink className="side-link" to={`/spazio/${current.id}`} title="Impostazioni dello spazio">
        <Cog size={20} strokeWidth={1.75} />
        Impostazioni
      </NavLink>
    </>
  );
}

/** Navigazione laterale desktop: le sezioni, le impostazioni dello spazio attivo, poi ciò che riguarda solo «me». */
export function Sidebar() {
  const isOn = useFeatures();
  const people = useScopedRecipients();
  const { isOpen, toggle } = useSideOpen();
  return (
    <aside className="sidebar" aria-label="Navigazione">
      {GROUPS.map(({ head, items }) => (
        <SideGroup
          key={head.to}
          head={head}
          items={items.filter((l) => !l.feature || isOn(l.feature))}
          open={isOpen(head.to)}
          onToggle={() => toggle(head.to)}
        />
      ))}
      {people.length > 0 && (
        <>
          <div className="label side-sep">Persone assistite</div>
          {people.map((p) => (
            <NavLink key={p.id} className="side-link" to={`/cura/${p.id}`}>
              <HeartPulse size={20} strokeWidth={1.75} />
              {careName(p)}
            </NavLink>
          ))}
        </>
      )}
      <SpaceSettingsLink />
      <div className="label side-sep">Solo per me</div>
      <NavLink className="side-link" to="/impostazioni">
        <UserRound size={20} strokeWidth={1.75} />
        Il mio profilo
      </NavLink>
    </aside>
  );
}
