import { ROLE_LABEL, shortName, type SpaceRole } from '@ohana/shared';
import type { Db } from '../db';
import { sendEmail } from '../email';
import type { Env } from '../env';
import { inviteSubject, renderInviteEmail } from '../invite-email';
import { jsonResponse } from './respond';
import { scanCors } from './scan-parse';

const ADMIN_ROLES = ['owner', 'admin'];

type Send = typeof sendEmail;

interface InviteRow {
  space_id: string;
  email: string;
  role: SpaceRole;
  token: string;
  expires_at: string;
  accepted_at: string | null;
}

type Reply = (body: unknown, status?: number) => Response;

/** L'invito richiesto, se esiste e chi chiama può gestirlo; altrimenti la risposta di errore da restituire. */
async function loadManagedInvite(
  req: Request,
  db: Db,
  reply: Reply,
): Promise<{ invite: InviteRow; userId: string } | Response> {
  const token = /^Bearer (.+)$/.exec(req.headers.get('Authorization') ?? '')?.[1];
  const { data: auth } = token ? await db.auth.getUser(token) : { data: { user: null } };
  if (!auth.user) {
    return reply({ error: 'auth' }, 401);
  }
  const body = (await req.json().catch(() => null)) as { id?: unknown } | null;
  if (typeof body?.id !== 'string') {
    return reply({ error: 'richiesta non valida' }, 400);
  }
  const { data } = await db
    .from('invites')
    .select('space_id, email, role, token, expires_at, accepted_at')
    .eq('id', body.id)
    .maybeSingle();
  const invite = data as InviteRow | null;
  const { data: member } = invite
    ? await db
        .from('space_members')
        .select('role')
        .eq('space_id', invite.space_id)
        .eq('user_id', auth.user.id)
        .maybeSingle()
    : { data: null };
  if (!invite || !member || !ADMIN_ROLES.includes(member.role as string)) {
    return reply({ error: 'non trovato' }, 404); // stessa risposta di «non esiste»: non rivela gli inviti altrui
  }
  return { invite, userId: auth.user.id };
}

/** Testo da mostrare: chi invita e il nome dello spazio, con un ripiego se mancano. */
async function buildMail(env: Env, db: Db, invite: InviteRow, userId: string) {
  const { data: space } = await db.from('spaces').select('name').eq('id', invite.space_id).maybeSingle();
  const { data: me } = await db
    .from('profiles')
    .select('first_name, nickname')
    .eq('id', userId)
    .maybeSingle();
  return {
    inviter: shortName(me as { first_name: string; nickname: string | null } | null) || 'Un familiare',
    spaceName: (space?.name as string | undefined) ?? 'uno spazio',
    roleLabel: ROLE_LABEL[invite.role],
    link: `${env.APP_URL}/invito/${invite.token}`,
  };
}

/**
 * `POST /invites/send` `{ id }`: manda per email il link d'invito all'indirizzo invitato.
 * Serve l'accesso dell'utente, che deve essere proprietario o amministratore dello spazio (come per creare l'invito).
 * Il destinatario è sempre quello salvato nell'invito: il chiamante non può scegliere un altro indirizzo.
 */
export async function handleInviteSend(
  req: Request,
  env: Env,
  db: Db,
  send: Send = sendEmail,
  now = new Date(),
): Promise<Response> {
  const reply: Reply = (body, status = 200) => jsonResponse(body, status, scanCors(env));
  const loaded = await loadManagedInvite(req, db, reply);
  if (loaded instanceof Response) {
    return loaded;
  }
  const { invite, userId } = loaded;
  if (invite.accepted_at) {
    return reply({ error: 'invito già accettato' }, 409);
  }
  if (new Date(invite.expires_at) < now) {
    return reply({ error: 'invito scaduto' }, 410);
  }
  const mail = await buildMail(env, db, invite, userId);
  try {
    await send(env, invite.email, inviteSubject(mail), renderInviteEmail(mail));
  } catch (e) {
    console.error('invito: email non inviata', (e as Error).message);
    return reply({ error: 'invio non riuscito' }, 502);
  }
  return reply({ ok: true });
}
