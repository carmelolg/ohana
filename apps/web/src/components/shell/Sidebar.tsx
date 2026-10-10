import { NavLink } from 'react-router-dom';
import {
  CalendarDays,
  ClipboardList,
  FileText,
  HeartPulse,
  Home,
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

const LINKS: { to: string; label: string; Icon: LucideIcon; feature?: SpaceFeature }[] = [
  { to: '/oggi', label: 'Oggi', Icon: Home },
  { to: '/calendario', label: 'Calendario', Icon: CalendarDays },
  { to: '/spesa', label: 'Spesa', Icon: ShoppingBasket, feature: 'spesa' },
  { to: '/cura', label: 'Cura', Icon: HeartPulse, feature: 'cura' },
  { to: '/pratiche', label: 'Pratiche', Icon: ClipboardList, feature: 'pratiche' },
  { to: '/manutenzioni', label: 'Manutenzioni', Icon: Wrench, feature: 'manutenzioni' },
  { to: '/documenti', label: 'Documenti', Icon: FileText, feature: 'documenti' },
  { to: '/rubrica', label: 'Rubrica', Icon: Users },
  { to: '/spese', label: 'Spese', Icon: Wallet, feature: 'spese' },
  { to: '/emergenza', label: 'Emergenza', Icon: Siren },
  { to: '/impostazioni', label: 'Impostazioni', Icon: Cog },
];

const ACTIVE = { background: 'var(--surface)', fontWeight: 600 };

/** Navigazione laterale desktop: sezioni e spazi. */
export function Sidebar({ onSpaces }: { onSpaces: () => void }) {
  const { spaces, selected, setSelected } = useSpace();
  const isOn = useFeatures();
  const people = useScopedRecipients();
  return (
    <aside className="sidebar" aria-label="Navigazione">
      {LINKS.filter((l) => !l.feature || isOn(l.feature)).map(({ to, label, Icon }) => (
        <NavLink key={to} className="side-link" to={to}>
          <Icon size={20} strokeWidth={1.75} />
          {label}
        </NavLink>
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
