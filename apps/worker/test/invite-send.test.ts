import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../src/env';
import { handleInviteSend } from '../src/http/invite-send';
import { inviteSubject, renderInviteEmail } from '../src/invite-email';
import { FakeDb } from './fake-db';

const NOW = new Date('2026-10-08T08:00:00Z');
const env = { APP_URL: 'https://app.example.it' } as Env;

describe('email d’invito', () => {
  const mail = {
    inviter: 'Luca',
    spaceName: 'Casa mia',
    roleLabel: 'Membro',
    link: 'https://app/invito/abc',
  };

  it('oggetto e corpo dicono chi invita, dove e con che ruolo, con il link', () => {
    expect(inviteSubject(mail)).toBe('Luca ti ha invitato in «Casa mia» su Ohana');
    const html = renderInviteEmail(mail);
    expect(html).toContain('Luca ti invita in «Casa mia»');
    expect(html).toContain('Membro');
    expect(html).toContain('href="https://app/invito/abc"');
  });

  it('nomi scritti da altri utenti non iniettano HTML', () => {
    const html = renderInviteEmail({ ...mail, inviter: '<img src=x onerror=alert(1)>', spaceName: '"><b>x' });
    expect(html).not.toContain('<img');
    expect(html).not.toContain('"><b>');
    expect(html).toContain('&lt;img');
  });
});

describe('POST /invites/send', () => {
  const invite = {
    id: 'inv1',
    space_id: 's1',
    email: 'ospite@example.it',
    role: 'member',
    token: 'tok123',
    expires_at: '2026-10-15T08:00:00Z',
    accepted_at: null,
  };
  const seed = (over: Record<string, unknown> = {}) =>
    new FakeDb({
      invites: [{ ...invite, ...over }],
      spaces: [{ id: 's1', name: 'Casa mia' }],
      profiles: [{ id: 'owner', first_name: 'Luca', nickname: null }],
      space_members: [
        { space_id: 's1', user_id: 'owner', role: 'owner' },
        { space_id: 's1', user_id: 'member', role: 'member' },
      ],
    });
  const asUser = (db: FakeDb) =>
    Object.assign(db.asDb(), {
      auth: {
        getUser: async (token: string) => ({
          data: { user: ['owner', 'member', 'stranger'].includes(token) ? { id: token } : null },
        }),
      },
    });
  const send = vi.fn(async () => undefined);
  const post = (db: FakeDb, token: string | null, body: unknown, sender = send) =>
    handleInviteSend(
      new Request('https://w/invites/send', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: JSON.stringify(body),
      }),
      env,
      asUser(db),
      sender,
      NOW,
    );

  beforeEach(() => {
    send.mockClear();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it('senza accesso: 401; senza id: 400', async () => {
    expect((await post(seed(), null, { id: 'inv1' })).status).toBe(401);
    expect((await post(seed(), 'owner', {})).status).toBe(400);
    expect(send).not.toHaveBeenCalled();
  });

  it('solo proprietario o amministratore: gli altri ricevono 404 e nessuna email parte', async () => {
    expect((await post(seed(), 'member', { id: 'inv1' })).status).toBe(404);
    expect((await post(seed(), 'stranger', { id: 'inv1' })).status).toBe(404);
    expect((await post(seed(), 'owner', { id: 'inesistente' })).status).toBe(404);
    expect(send).not.toHaveBeenCalled();
  });

  it('scrive all’indirizzo salvato nell’invito, col link firmato dal token', async () => {
    const res = await post(seed(), 'owner', { id: 'inv1' });
    expect(res.status).toBe(200);
    expect(send).toHaveBeenCalledTimes(1);
    const [, to, subject, html] = send.mock.calls[0] as unknown as [Env, string, string, string];
    expect(to).toBe('ospite@example.it');
    expect(subject).toBe('Luca ti ha invitato in «Casa mia» su Ohana');
    expect(html).toContain('https://app.example.it/invito/tok123');
  });

  it('invito già accettato: 409; scaduto: 410', async () => {
    expect((await post(seed({ accepted_at: NOW.toISOString() }), 'owner', { id: 'inv1' })).status).toBe(409);
    expect((await post(seed({ expires_at: '2026-10-01T00:00:00Z' }), 'owner', { id: 'inv1' })).status).toBe(
      410,
    );
    expect(send).not.toHaveBeenCalled();
  });

  it('se il provider fallisce risponde 502 senza dettagli tecnici', async () => {
    const failing = vi.fn(async () => {
      throw new Error('Resend 500: chiave segreta sbagliata');
    });
    const res = await post(seed(), 'owner', { id: 'inv1' }, failing);
    expect(res.status).toBe(502);
    expect(await res.text()).not.toContain('segreta');
  });
});
