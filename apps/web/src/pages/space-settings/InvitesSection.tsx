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
import { useAuth } from '../../lib/auth';
import { shareInviteLink } from '../../lib/shareInvite';
import { useToast } from '../../lib/toast';
import type { Space } from '../../lib/types';
import { useSpaceAction } from './useSpaceAction';

const INVITABLE_ROLES: SpaceRole[] = ['admin', 'member', 'viewer', 'care_viewer'];

interface RowProps {
  invite: SpaceInvite;
  onShare: () => void;
  onCancel: () => void;
}

function InviteRow({ invite: i, onShare, onCancel }: RowProps) {
  return (
    <div className="kv">
      <span style={{ color: 'inherit' }}>
        {i.email}
        <br />
        <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
          {ROLE_LABEL[i.role]}
          {new Date(i.expires_at) < new Date() ? ' · scaduto' : ''}
        </span>
        <br />
        <span
          data-testid="invite-link"
          className="mono muted"
          style={{ fontSize: 11, wordBreak: 'break-all', fontWeight: 400 }}
        >
          {inviteLink(i)}
        </span>
      </span>
      <span className="hstack">
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
  const toast = useToast();
  const qc = useQueryClient();
  const { run } = useSpaceAction();
  const { data: invites = [] } = usePendingInvites(space.id, true);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<SpaceRole>('member');
  const reload = () => qc.invalidateQueries({ queryKey: ['invites', space.id] });

  async function share(invite: SpaceInvite) {
    const outcome = await shareInviteLink(space.name, inviteLink(invite));
    if (outcome === 'copied') {
      toast('Link d’invito copiato · valido 7 giorni');
    }
  }

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
    await share(created);
  }

  async function cancel(id: string) {
    await cancelInvite(id);
    void reload();
  }

  return (
    <>
      <div className="label section-label">Invita</div>
      <p className="muted" style={{ fontSize: 14 }}>
        Chi inviti vedrà solo questo spazio. Il link vale 7 giorni e funziona solo con l’email indicata.
      </p>
      <form className="stack" style={{ marginTop: 10 }} onSubmit={invite}>
        <input
          className="input"
          type="email"
          required
          placeholder="Email della persona"
          aria-label="Email da invitare"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
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
        <button className="btn accent" type="submit">
          Crea link d’invito
        </button>
      </form>
      {invites.map((i) => (
        <InviteRow key={i.id} invite={i} onShare={() => share(i)} onCancel={() => cancel(i.id)} />
      ))}
    </>
  );
}
