import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SpaceRole } from '@ohana/shared';
import { removeMember, setMemberRole, updateMemberProfile, type MemberPerson } from '../../lib/api/spaces';
import { SettingsCard } from '../../components/SettingsCard';
import { useAuth } from '../../lib/auth';
import { useSpace } from '../../lib/data';
import { useDialog } from '../../lib/dialog';
import { useToast } from '../../lib/toast';
import type { Member, Space } from '../../lib/types';
import { MemberProfileSheet } from './MemberProfileSheet';
import { MemberRow } from './MemberRow';
import { canEditMember, canEditProfile, leaveDialog, removalError } from './memberRules';
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
  const [editing, setEditing] = useState<Member | null>(null);

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
    <SettingsCard
      id="persone"
      title="Persone"
      hint={`${space.space_members.length} ${space.space_members.length === 1 ? 'persona' : 'persone'} in questo spazio. Il ruolo decide cosa può fare.`}
    >
      {space.space_members.map((m) => (
        <MemberRow
          key={m.user_id}
          member={m}
          isSelf={m.user_id === me}
          myRole={role}
          canEdit={canEditMember(role, m.role)}
          onRole={(next) => run(() => setMemberRole(space.id, m.user_id, next))}
          onEditProfile={canEditProfile(role) && m.user_id !== me ? () => setEditing(m) : null}
          onLeaveOrRemove={() => leaveOrRemove(m.user_id)}
        />
      ))}
      {editing && (
        <MemberProfileSheet
          member={editing}
          onSave={(person: MemberPerson) => run(() => updateMemberProfile(space.id, editing.user_id, person))}
          onClose={() => setEditing(null)}
        />
      )}
    </SettingsCard>
  );
}
