import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ROLE_LABEL, type SpaceRole } from '@ohana/shared';
import {
  cancelInvite,
  createInvite,
  inviteLink,
  usePendingInvites,
  type SpaceInvite,
} from '../../lib/api/spaces';
import { SettingsCard } from '../../components/SettingsCard';
import { useAuth } from '../../lib/auth';
import type { Space } from '../../lib/types';
import { useInviteDelivery } from './useInviteDelivery';
import { useSpaceAction } from './useSpaceAction';

const INVITABLE_ROLES: SpaceRole[] = ['admin', 'member', 'viewer', 'care_viewer'];

interface RowProps {
  invite: SpaceInvite;
  onEmail: () => void;
  onShare: () => void;
  onCancel: () => void;
}

function InviteRow({ invite: i, onEmail, onShare, onCancel }: RowProps) {
  const expired = new Date(i.expires_at) < new Date();
  return (
    <div className="set-row set-row-wrap">
      <div className="set-row-text">
        <span>{i.email}</span>
        <span className="muted set-hint">
          {ROLE_LABEL[i.role]} · {expired ? 'scaduto' : 'in attesa'}
        </span>
        <span data-testid="invite-link" className="mono muted invite-url">
          {inviteLink(i)}
        </span>
      </div>
      <span className="set-actions">
        <button className="btn ghost small" onClick={onEmail}>
          Invia email
        </button>
        <button className="btn ghost small" onClick={onShare}>
          Copia link
        </button>
        <button className="icon-btn" aria-label="Annulla invito" onClick={onCancel}>
          ✕
        </button>
      </span>
    </div>
  );
}

/** Inviti: crea il link (valido 7 giorni, solo con l'email indicata), lo condivide o lo copia, elenca quelli in attesa. */
export function InvitesSection({ space }: { space: Space }) {
  const { session } = useAuth();
  const qc = useQueryClient();
  const { run } = useSpaceAction();
  const { deliver, emailInvite, shareLink } = useInviteDelivery(space.name);
  const { data: invites = [] } = usePendingInvites(space.id, true);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<SpaceRole>('member');
  const reload = () => qc.invalidateQueries({ queryKey: ['invites', space.id] });

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    let created: SpaceInvite | undefined;
    const ok = await run(
      async () => {
        created = await createInvite(space.id, email, role, session!.user.id);
      },
      { refresh: false },
    );
    if (!ok || !created) {
      return;
    }
    setEmail('');
    void reload();
    await deliver(created);
  }

  async function cancel(id: string) {
    await cancelInvite(id);
    void reload();
  }

  return (
    <SettingsCard
      id="inviti"
      title="Invita persone"
      hint="Chi inviti vedrà solo questo spazio. Gli mandiamo un’email col link, che vale 7 giorni e funziona solo con quell’indirizzo."
    >
      <form className="form-grid set-invite" onSubmit={invite}>
        <label className="field">
          <span className="label">Email</span>
          <input
            className="input"
            type="email"
            required
            placeholder="Email della persona"
            aria-label="Email da invitare"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="field">
          <span className="label">Ruolo</span>
          <select
            className="input"
            aria-label="Ruolo"
            value={role}
            onChange={(e) => setRole(e.target.value as SpaceRole)}
          >
            {INVITABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </label>
        <button className="btn accent form-wide" type="submit">
          Invia invito
        </button>
      </form>
      {invites.length > 0 && <div className="label set-sublabel">In attesa</div>}
      {invites.map((i) => (
        <InviteRow
          key={i.id}
          invite={i}
          onEmail={() => void emailInvite(i)}
          onShare={() => shareLink(i)}
          onCancel={() => cancel(i.id)}
        />
      ))}
    </SettingsCard>
  );
}
