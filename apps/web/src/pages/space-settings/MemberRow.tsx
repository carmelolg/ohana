import { LogOut, Pencil, UserMinus } from 'lucide-react';
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
  /** Presente solo per chi può correggere nome e cognome (il proprietario, sugli altri). */
  onEditProfile: (() => void) | null;
  onLeaveOrRemove: () => void;
  /** Cambio di ruolo o rimozione in corso: la riga resta bloccata finché la richiesta non finisce. */
  busy: boolean;
}

/** Una persona dello spazio: avatar, nome, ruolo (modificabile se si può) e uscita/rimozione. */
export function MemberRow({
  member: m,
  isSelf,
  myRole,
  canEdit,
  onRole,
  onEditProfile,
  onLeaveOrRemove,
  busy,
}: Props) {
  const name = fullName(m.profiles);
  const canLeaveOrRemove = isSelf || canEdit;
  return (
    <div className="member-row">
      <div className="member-id">
        <Avatar
          size={36}
          first={m.profiles.first_name}
          last={m.profiles.last_name}
          nickname={m.profiles.nickname}
          url={m.profiles.avatar_url}
        />
        <div className="set-row-text">
          <span className="member-name">{isSelf ? 'Tu' : name}</span>
          {!(canEdit && !isSelf) && <span className="muted set-hint">{ROLE_LABEL[m.role]}</span>}
        </div>
      </div>
      {canEdit && !isSelf && (
        <select
          className="inline-select member-role"
          aria-label={`Ruolo di ${name}`}
          value={m.role}
          onChange={(e) => onRole(e.target.value as SpaceRole)}
          disabled={busy}
          aria-busy={busy}
        >
          {assignableRoles(myRole).map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </select>
      )}
      <div className="member-tools">
        {onEditProfile && (
          <button
            type="button"
            className="icon-btn tool-btn"
            aria-label={`Modifica i dati di ${name}`}
            title="Modifica i dati"
            onClick={onEditProfile}
          >
            <Pencil size={18} strokeWidth={1.75} />
          </button>
        )}
        {canLeaveOrRemove && (
          <button
            type="button"
            className="icon-btn tool-btn tool-danger"
            aria-label={isSelf ? 'Esci' : 'Rimuovi'}
            title={isSelf ? 'Esci dallo spazio' : 'Rimuovi dallo spazio'}
            onClick={onLeaveOrRemove}
            disabled={busy}
            aria-busy={busy}
          >
            {isSelf ? <LogOut size={18} strokeWidth={1.75} /> : <UserMinus size={18} strokeWidth={1.75} />}
          </button>
        )}
      </div>
    </div>
  );
}
