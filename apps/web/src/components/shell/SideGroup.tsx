import { ChevronDown, ChevronRight } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import type { SideLink } from './Sidebar';

interface Props {
  head: SideLink;
  items: SideLink[];
  open: boolean;
  onToggle: () => void;
}

/** Un'area della barra laterale: la testata porta alla pagina, la freccia apre o chiude le sottovoci. */
export function SideGroup({ head, items, open, onToggle }: Props) {
  const listId = `side-${head.to.slice(1)}`;
  const collapsible = items.length > 0;
  const Chevron = open ? ChevronDown : ChevronRight;
  return (
    <div className="side-group">
      <div className="side-head-row">
        <NavLink className="side-link side-head" to={head.to} end={collapsible}>
          <head.Icon size={20} strokeWidth={1.75} />
          {head.label}
        </NavLink>
        {collapsible && (
          <button
            className="icon-btn side-toggle"
            aria-expanded={open}
            aria-controls={listId}
            aria-label={`${open ? 'Comprimi' : 'Espandi'} ${head.label}`}
            onClick={onToggle}
          >
            <Chevron size={18} strokeWidth={1.75} />
          </button>
        )}
      </div>
      {collapsible && open && (
        <div id={listId} className="side-sublist">
          {items.map(({ to, label, Icon }) => (
            <NavLink key={to} className="side-link side-sub" to={to}>
              <Icon size={18} strokeWidth={1.75} />
              {label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}
