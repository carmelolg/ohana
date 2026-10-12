import { inviteLink, sendInviteEmail, type SpaceInvite } from '../../lib/api/spaces';
import { shareInviteLink } from '../../lib/shareInvite';
import { useToast } from '../../lib/toast';

/**
 * Consegna un invito: prima l'email all'indirizzo invitato; se non parte (offline, Worker irraggiungibile)
 * si ripiega sul link da condividere o copiare a mano, così l'invito non resta bloccato.
 */
export function useInviteDelivery(spaceName: string) {
  const toast = useToast();

  async function shareLink(invite: SpaceInvite) {
    const outcome = await shareInviteLink(spaceName, inviteLink(invite));
    if (outcome === 'copied') {
      toast('Link d’invito copiato · valido 7 giorni');
    }
  }

  async function emailInvite(invite: SpaceInvite): Promise<boolean> {
    try {
      await sendInviteEmail(invite.id);
      toast(`Email d’invito inviata a ${invite.email}`);
      return true;
    } catch (e) {
      toast((e as Error).message);
      return false;
    }
  }

  async function deliver(invite: SpaceInvite) {
    if (!(await emailInvite(invite))) {
      await shareLink(invite);
    }
  }

  return { deliver, emailInvite, shareLink };
}
