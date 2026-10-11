import { Link, useLocation } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { spaceColor } from '../../lib/color';
import { useSpace } from '../../lib/data';
import { AvatarMenu } from '../AvatarMenu';

interface Props {
  editor: boolean;
  onSpaces: () => void;
  onSearch: () => void;
  onCreate: () => void;
}

function Brand() {
  const loc = useLocation();
  return (
    <Link
      to="/oggi"
      className="navbar-brand"
      aria-label="Ohana, vai a Oggi"
      onClick={() => loc.pathname === '/oggi' && window.scrollTo({ top: 0, behavior: 'smooth' })}
    >
      <img src="/icons/icon.svg" alt="" width={32} height={32} />
      <span className="brand-word">Ohana</span>
    </Link>
  );
}

function SpaceChips() {
  const { spaces, selected, setSelected } = useSpace();
  return (
    <div className="chips space-chips" role="group" aria-label="Filtra per spazio">
      <button className="chip" aria-pressed={selected === 'all'} onClick={() => setSelected('all')}>
        Tutti
      </button>
      {spaces.map((s) => (
        <button
          key={s.id}
          className="chip"
          aria-pressed={selected === s.id}
          onClick={() => setSelected(s.id)}
        >
          <span className="dot" style={{ background: spaceColor(s.color_hue) }} />
          {s.name}
        </button>
      ))}
    </div>
  );
}

/** Barra superiore: indipendente dal contenuto, a tutta larghezza, separata dal corpo da un filetto. */
export function TopBar({ editor, onSpaces, onSearch, onCreate }: Props) {
  const { current } = useSpace();
  const title = current?.name ?? 'Tutti gli spazi';
  return (
    <header className={'navbar' + (editor ? ' navbar-editor' : '')}>
      <div className="navbar-row">
        <div className="navbar-left">
          <Brand />
          <button className="space-title" onClick={onSpaces} aria-haspopup="dialog" title={title}>
            {current && <span className="dot" />}
            <span className="space-title-text">{title}</span>
            <span aria-hidden>▾</span>
          </button>
        </div>
        <div className="navbar-right">
          <button className="search-field navbar-action" onClick={onSearch} aria-label="Cerca">
            <Search size={18} strokeWidth={1.75} />
            <span className="search-field-text">Cerca impegni, contatti, documenti…</span>
            <span className="kbd">/</span>
          </button>
          <button className="btn accent small navbar-action" onClick={onCreate}>
            <Plus size={18} strokeWidth={2} /> Nuovo <span className="kbd kbd-inv">N</span>
          </button>
          <button className="icon-btn navbar-search-mobile" onClick={onSearch} aria-label="Cerca">
            <Search size={22} strokeWidth={1.75} />
          </button>
          <AvatarMenu onManageSpaces={onSpaces} />
        </div>
      </div>
      <SpaceChips />
    </header>
  );
}
