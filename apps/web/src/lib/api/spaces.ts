import type { SpaceRole } from '@ohana/shared';
import { useAuthedQuery } from '../data/query';
import { WORKER_URL } from '../config';
import { supabase } from '../supabase';
import { unwrap } from './result';
import { trackBusy } from '../busy';

export interface SpaceInvite {
  id: string;
  email: string;
  role: SpaceRole;
  token: string;
  expires_at: string;
  accepted_at: string | null;
}

export interface InvitePreview {
  space_name: string;
  space_color_hue: number;
  invited_by_name: string;
  email: string;
  role: SpaceRole;
  expired: boolean;
}

interface NewSpace {
  id: string;
  name: string;
  colorHue: number;
  createdBy: string;
}

/** Le categorie predefinite le crea il database insieme allo spazio. */
export async function createSpace({ id, name, colorHue, createdBy }: NewSpace): Promise<void> {
  unwrap(
    await trackBusy(async () =>
      supabase.from('spaces').insert({ id, name, color_hue: colorHue, created_by: createdBy }),
    ),
  );
}

export async function updateSpace(
  id: string,
  patch: { name?: string; color_hue?: number; disabled_features?: string[] },
): Promise<void> {
  unwrap(await trackBusy(async () => supabase.from('spaces').update(patch).eq('id', id)));
}

export async function deleteSpace(id: string): Promise<void> {
  unwrap(await trackBusy(async () => supabase.from('spaces').delete().eq('id', id)));
}

export async function setMemberRole(spaceId: string, userId: string, role: SpaceRole): Promise<void> {
  unwrap(
    await trackBusy(async () =>
      supabase.from('space_members').update({ role }).match({ space_id: spaceId, user_id: userId }),
    ),
  );
}

export interface MemberPerson {
  first: string;
  last: string;
  nick: string;
}

/** Il proprietario corregge i dati anagrafici di un membro: passa da una funzione che tocca solo questi tre campi. */
export async function updateMemberProfile(
  spaceId: string,
  userId: string,
  person: MemberPerson,
): Promise<void> {
  unwrap(
    await trackBusy(async () =>
      supabase.rpc('update_member_profile', {
        sid: spaceId,
        uid: userId,
        first: person.first,
        last: person.last,
        nick: person.nick,
      }),
    ),
  );
}

export async function removeMember(spaceId: string, userId: string): Promise<void> {
  unwrap(
    await trackBusy(async () =>
      supabase.from('space_members').delete().match({ space_id: spaceId, user_id: userId }),
    ),
  );
}

export const usePendingInvites = (spaceId: string, enabled: boolean) =>
  useAuthedQuery<SpaceInvite[]>(
    ['invites', spaceId],
    () =>
      supabase
        .from('invites')
        .select('*')
        .eq('space_id', spaceId)
        .is('accepted_at', null)
        .order('created_at', { ascending: false }),
    enabled,
  );

export async function createInvite(
  spaceId: string,
  email: string,
  role: SpaceRole,
  invitedBy: string,
): Promise<SpaceInvite> {
  const { data } = unwrap(
    await trackBusy(async () =>
      supabase
        .from('invites')
        .insert({ space_id: spaceId, email: email.trim().toLowerCase(), role, invited_by: invitedBy })
        .select()
        .single(),
    ),
  );
  return data as SpaceInvite;
}

export async function cancelInvite(id: string): Promise<void> {
  unwrap(await trackBusy(async () => supabase.from('invites').delete().eq('id', id)));
}

export const inviteLink = (invite: Pick<SpaceInvite, 'token'>): string =>
  `${window.location.origin}/invito/${invite.token}`;

export async function previewInvite(token: string): Promise<InvitePreview | null> {
  const { data } = await trackBusy(async () => supabase.rpc('get_invite_preview', { invite_token: token }));
  return (data as InvitePreview[] | null)?.[0] ?? null;
}

/** Accetta l'invito e restituisce l'id dello spazio. */
export async function acceptInvite(token: string): Promise<string> {
  const { data } = unwrap(
    await trackBusy(async () => supabase.rpc('accept_invite', { invite_token: token })),
  );
  return data as string;
}

/** Cosa dire all'utente quando il Worker non riesce a mandare l'email d'invito. */
export function inviteEmailFailure(status: number): string {
  if (status === 409) {
    return 'L’invito è già stato accettato';
  }
  if (status === 410) {
    return 'L’invito è scaduto: creane uno nuovo';
  }
  return 'Non sono riuscito a mandare l’email. Puoi copiare il link e inviarlo tu.';
}

/** Chiede al Worker di mandare per email il link d'invito all'indirizzo invitato. Richiede la rete. */
export async function sendInviteEmail(inviteId: string): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error(inviteEmailFailure(401));
  }
  let res: Response;
  try {
    res = await trackBusy(() =>
      fetch(`${WORKER_URL}/invites/send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: inviteId }),
      }),
    );
  } catch {
    throw new Error(inviteEmailFailure(0)); // offline o Worker irraggiungibile
  }
  if (!res.ok) {
    throw new Error(inviteEmailFailure(res.status));
  }
}
