import { useNavigate } from 'react-router-dom';
import type { SpaceRole } from '@ohana/shared';
import { removeMember, setMemberRole } from '../../lib/api/spaces';
import { useAuth } from '../../lib/auth';
import { useSpace } from '../../lib/data';
import { useDialog } from '../../lib/dialog';
import { useToast } from '../../lib/toast';
import type { Space } from '../../lib/types';
import { MemberRow } from './MemberRow';
import { canEditMember, leaveDialog, removalError } from './memberRules';
import { useSpaceAction } from './useSpaceAction';

/** Persone dello spazio: ruolo modificabile secondo i propri permessi, uscita e rimozione. */
export function MembersSection({ space, role }: { space: Space; role: SpaceRole | undefined }) {
  const { session } = useAuth();
  const { setSelected } = useSpace();
  const { run, refresh } = useSpaceAction();
  const dialog = useDialog();
  const toast = useToast();
  const nav = useNavigate();
  const me = session!.user.id;

  async function leaveOrRemove(userId: string) {
    const self = userId === me;
    if (!(await dialog.confirm(leaveDialog(self)))) {
      return;
    }
    try {
      await removeMember(space.id, userId);
    } catch (e) {
      return toast(removalError((e as Error).message));
    }
    await refresh();
    if (self) {
      setSelected('all');
      nav('/oggi');
    }
  }

  return (
    <>
      <div className="label section-label">Persone</div>
      <div className="group">
        {space.space_members.map((m) => (
          <MemberRow
            key={m.user_id}
            member={m}
            isSelf={m.user_id === me}
            myRole={role}
            canEdit={canEditMember(role, m.role)}
            onRole={(next) => run(() => setMemberRole(space.id, m.user_id, next))}
            onLeaveOrRemove={() => leaveOrRemove(m.user_id)}
          />
        ))}
      </div>
    </>
  );
}
