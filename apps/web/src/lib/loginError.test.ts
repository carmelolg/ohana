import { describe, expect, it } from 'vitest';
import { oauthErrorMessage, sendLinkErrorMessage } from './loginError';

describe('sendLinkErrorMessage', () => {
  it('traduce il rifiuto della registrazione chiusa', () => {
    const err = new Error('Accesso riservato: serve un invito. Chiedi a chi gestisce Ohana.');
    expect(sendLinkErrorMessage(err)).toContain('su invito');
  });

  it('per gli altri errori mantiene il prefisso e il messaggio', () => {
    expect(sendLinkErrorMessage(new Error('rate limit'))).toBe('Non riesco a inviare il link: rate limit');
  });

  it('regge un errore che non è un Error', () => {
    expect(sendLinkErrorMessage('boom')).toBe('Non riesco a inviare il link: ');
  });
});

describe('oauthErrorMessage', () => {
  it('senza errore nell’indirizzo non dice nulla', () => {
    expect(oauthErrorMessage('', '')).toBeNull();
    expect(oauthErrorMessage('?code=abc', '')).toBeNull();
  });

  it('riconosce il rifiuto dell’hook, in query o in hash', () => {
    const desc = encodeURIComponent('Accesso riservato: serve un invito.');
    expect(oauthErrorMessage(`?error=access_denied&error_description=${desc}`, '')).toContain('su invito');
    expect(oauthErrorMessage('', `#error=server_error&error_description=${desc}`)).toContain('su invito');
  });

  it('per un altro errore dà un messaggio generico senza dettagli tecnici', () => {
    expect(oauthErrorMessage('?error=server_error&error_description=boom', '')).toBe(
      'Accesso non riuscito. Riprova o usa il link via email.',
    );
  });
});
