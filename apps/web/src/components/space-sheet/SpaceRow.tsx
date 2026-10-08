import { fullName, spaceColor } from '../../lib/color';
import type { Space } from '../../lib/types';
import { Avatar } from '../ui';

interface Props {
  space: Space;
  me: string | undefined;
  active: boolean;
  onPick: () => void;
  onManage: () => void;
}

/** Una riga della lista spazi: nome, membri (nomi e avatar), badge se attivo, accesso alla gestione. */
export function SpaceRow({ space: s, me, active, onPick, onManage }: Props) {
  const names = s.space_members
    .map((m) => (m.user_id === me ? 'Tu' : fullName(m.profiles).split(' ')[0]))
    .join(', ');
  return (
    <div
      className={'sheet-row' + (active ? ' active' : '')}
      style={{ ['--space' as string]: spaceColor(s.color_hue) }}
    >
      <button
        style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, textAlign: 'left', minHeight: 44 }}
        onClick={onPick}
      >
        <span className="dotl" />
        <span style={{ flex: 1 }}>
          <b style={{ fontSize: 16 }}>{s.name}</b>
          <br />
          <span className="muted" style={{ fontSize: 13 }}>
            {names}
          </span>
        </span>
        {active && <span className="badge">ATTIVO</span>}
        <span style={{ display: 'flex' }}>
          {s.space_members.slice(0, 3).map((m, i) => (
            <span key={m.user_id} style={{ marginLeft: i ? -8 : 0 }}>
              <Avatar
                size={26}
                first={m.profiles.first_name}
                last={m.profiles.last_name}
                nickname={m.profiles.nickname}
                url={m.profiles.avatar_url}
              />
            </span>
          ))}
        </span>
      </button>
      <button className="icon-btn" aria-label={`Gestisci ${s.name}`} onClick={onManage}>
        ⋯
      </button>
    </div>
  );
}
