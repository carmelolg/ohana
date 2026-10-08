import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, LogOut, UserRound } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { fullName } from '../lib/color';
import { Avatar } from './ui';

/**
 * Menu dell'account sull'avatar: tutto ciò che riguarda «me» (profilo e impostazioni, spazi e inviti, esci).
 * I contenuti (Oggi, Calendario, Spesa, Rubrica, Spese) restano nella navigazione principale.
 */
export function AvatarMenu({ onManageSpaces }: { onManageSpaces: () => void }) {
  const { profile, signOut } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    wrap.current?.querySelector<HTMLElement>('[role=menuitem]')?.focus();
    const away = (e: PointerEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
        btn.current?.focus();
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const items = [...(wrap.current?.querySelectorAll<HTMLElement>('[role=menuitem]') ?? [])];
        const i = items.indexOf(document.activeElement as HTMLElement);
        items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
      }
      if (e.key === 'Tab') {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', key);
    };
  }, [open]);

  const go = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };
  const name = fullName(profile) || 'Il mio profilo';

  return (
    <div className="avatar-menu" ref={wrap}>
      <button
        ref={btn}
        className="avatar-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menu del profilo"
        onClick={() => setOpen((o) => !o)}
      >
        <Avatar
          first={profile?.first_name}
          last={profile?.last_name}
          nickname={profile?.nickname}
          url={profile?.avatar_url}
        />
      </button>
      {open && (
        <div className="menu" role="menu" aria-label="Profilo">
          <div className="menu-head">
            <Avatar
              size={40}
              first={profile?.first_name}
              last={profile?.last_name}
              nickname={profile?.nickname}
              url={profile?.avatar_url}
            />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
              <div className="muted" style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {profile?.email}
              </div>
            </div>
          </div>
          <button role="menuitem" className="menu-item" onClick={go(() => nav('/impostazioni'))}>
            <UserRound size={18} strokeWidth={1.75} /> Profilo e impostazioni
          </button>
          <button role="menuitem" className="menu-item" onClick={go(onManageSpaces)}>
            <Layers size={18} strokeWidth={1.75} /> Spazi e inviti
          </button>
          <div className="menu-sep" role="separator" />
          <button role="menuitem" className="menu-item" onClick={go(() => void signOut())}>
            <LogOut size={18} strokeWidth={1.75} /> Esci
          </button>
        </div>
      )}
    </div>
  );
}
