import { escapeHtml } from './escape-html';

export interface InviteMail {
  /** Chi invita (nome mostrato agli altri). */
  inviter: string;
  spaceName: string;
  roleLabel: string;
  link: string;
}

export const inviteSubject = ({ inviter, spaceName }: InviteMail): string =>
  `${inviter} ti ha invitato in «${spaceName}» su Ohana`;

/** Email d'invito: nome dello spazio e di chi invita li scrivono altri utenti, quindi passano sempre da `escapeHtml`. */
export function renderInviteEmail(mail: InviteMail): string {
  const { inviter, spaceName, roleLabel, link } = mail;
  return `<!DOCTYPE html><html lang="it"><body style="margin:0;background:#f6f2eb;padding:32px 16px;font-family:'Helvetica Neue',Arial,sans-serif;color:#26211c;"><div style="max-width:560px;margin:0 auto;background:#fffdf9;border-radius:16px;padding:32px;"><p style="margin:0 0 6px;font-family:Menlo,monospace;font-size:12px;letter-spacing:.08em;color:#6f665c;">INVITO</p><h1 style="margin:0 0 16px;font-size:26px;">${escapeHtml(inviter)} ti invita in «${escapeHtml(spaceName)}»</h1><p style="margin:0 0 8px;font-size:16px;line-height:1.5;">Ohana è l'app di famiglia per impegni, spesa, scadenze e spese. Entrerai nello spazio come <strong>${escapeHtml(roleLabel)}</strong>.</p><p style="margin:24px 0;"><a href="${escapeHtml(link)}" style="display:inline-block;padding:14px 26px;border-radius:26px;background:#a3532f;color:#fffdf9;font-weight:600;text-decoration:none;">Accetta l'invito</a></p><p style="margin:0;font-size:13px;line-height:1.5;color:#6f665c;">Il link vale 7 giorni e funziona solo con questo indirizzo email. Se non ti aspettavi questo invito, ignora il messaggio.</p></div></body></html>`;
}
