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
  Plus,
  Settings as Cog,
  ShoppingBasket,
  Siren,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import type { SpaceFeature } from '@ohana/shared';
import { spaceColor } from '../../lib/color';
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
  { head: { to: '/impostazioni', label: 'Impostazioni', Icon: Cog }, items: [] },
];

const ACTIVE = { background: 'var(--surface)', fontWeight: 600 };

/** Navigazione laterale desktop: sezioni e spazi. */
export function Sidebar({ onSpaces }: { onSpaces: () => void }) {
  const { spaces, selected, setSelected } = useSpace();
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
      <div className="label side-sep">Spazi</div>
      <button
        className="side-link"
        aria-pressed={selected === 'all'}
        onClick={() => setSelected('all')}
        style={selected === 'all' ? ACTIVE : undefined}
      >
        <span className="dot" style={{ background: 'var(--text)' }} />
        Tutti gli spazi
      </button>
      {spaces.map((s) => (
        <button
          key={s.id}
          className="side-link"
          onClick={() => setSelected(s.id)}
          style={selected === s.id ? ACTIVE : undefined}
        >
          <span className="dot" style={{ background: spaceColor(s.color_hue) }} />
          {s.name}
        </button>
      ))}
      <button className="side-link muted" onClick={onSpaces}>
        <Plus size={20} strokeWidth={1.75} />
        Gestisci spazi
      </button>
    </aside>
  );
}
