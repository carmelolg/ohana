import type { SpaceRole } from '@ohana/shared';
import { useAuthedQuery } from '../data/query';
import { supabase } from '../supabase';
import { unwrap } from './result';

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
  unwrap(await supabase.from('spaces').insert({ id, name, color_hue: colorHue, created_by: createdBy }));
}

export async function updateSpace(
  id: string,
  patch: { name?: string; color_hue?: number; disabled_features?: string[] },
): Promise<void> {
  unwrap(await supabase.from('spaces').update(patch).eq('id', id));
}

export async function deleteSpace(id: string): Promise<void> {
  unwrap(await supabase.from('spaces').delete().eq('id', id));
}

export async function setMemberRole(spaceId: string, userId: string, role: SpaceRole): Promise<void> {
  unwrap(await supabase.from('space_members').update({ role }).match({ space_id: spaceId, user_id: userId }));
}

export async function removeMember(spaceId: string, userId: string): Promise<void> {
  unwrap(await supabase.from('space_members').delete().match({ space_id: spaceId, user_id: userId }));
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
    await supabase
      .from('invites')
      .insert({ space_id: spaceId, email: email.trim().toLowerCase(), role, invited_by: invitedBy })
      .select()
      .single(),
  );
  return data as SpaceInvite;
}

export async function cancelInvite(id: string): Promise<void> {
  unwrap(await supabase.from('invites').delete().eq('id', id));
}

export const inviteLink = (invite: Pick<SpaceInvite, 'token'>): string =>
  `${window.location.origin}/invito/${invite.token}`;

export async function previewInvite(token: string): Promise<InvitePreview | null> {
  const { data } = await supabase.rpc('get_invite_preview', { invite_token: token });
  return (data as InvitePreview[] | null)?.[0] ?? null;
}

/** Accetta l'invito e restituisce l'id dello spazio. */
export async function acceptInvite(token: string): Promise<string> {
  const { data } = unwrap(await supabase.rpc('accept_invite', { invite_token: token }));
  return data as string;
}
