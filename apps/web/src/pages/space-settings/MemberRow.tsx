import { ROLE_LABEL, type SpaceRole } from '@ohana/shared';
import { Avatar } from '../../components/ui';
import { fullName } from '../../lib/color';
import type { Member } from '../../lib/types';
import { assignableRoles } from './memberRules';

interface Props {
  member: Member;
  isSelf: boolean;
  myRole: SpaceRole | undefined;
  canEdit: boolean;
  onRole: (role: SpaceRole) => void;
  onLeaveOrRemove: () => void;
}

/** Una persona dello spazio: avatar, nome, ruolo (modificabile se si può) e uscita/rimozione. */
export function MemberRow({ member: m, isSelf, myRole, canEdit, onRole, onLeaveOrRemove }: Props) {
  return (
    <div className="kv">
      <span className="hstack" style={{ color: 'inherit' }}>
        <Avatar
          size={32}
          first={m.profiles.first_name}
          last={m.profiles.last_name}
          nickname={m.profiles.nickname}
          url={m.profiles.avatar_url}
        />
        {isSelf ? 'Tu' : fullName(m.profiles)}
      </span>
      <span className="hstack">
        {canEdit && !isSelf ? (
          <select
            className="inline-select"
            aria-label={`Ruolo di ${fullName(m.profiles)}`}
            value={m.role}
            onChange={(e) => onRole(e.target.value as SpaceRole)}
          >
            {assignableRoles(myRole).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        ) : (
          <span className="muted">{ROLE_LABEL[m.role]}</span>
        )}
        {(isSelf || canEdit) && (
          <button className="btn ghost small" onClick={onLeaveOrRemove}>
            {isSelf ? 'Esci' : 'Rimuovi'}
          </button>
        )}
      </span>
    </div>
  );
}
