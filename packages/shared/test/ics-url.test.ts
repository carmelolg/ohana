import { describe, expect, it } from 'vitest';
import { normalizeIcsUrl } from '../src';

describe('normalizeIcsUrl', () => {
  it('accetta https e converte webcal in https', () => {
    expect(
      normalizeIcsUrl('https://calendar.google.com/calendar/ical/x%40gmail.com/private-abc/basic.ics'),
    ).toBe('https://calendar.google.com/calendar/ical/x%40gmail.com/private-abc/basic.ics');
    expect(normalizeIcsUrl('  webcal://p01-caldav.icloud.com/published/2/abc ')).toBe(
      'https://p01-caldav.icloud.com/published/2/abc',
    );
    expect(normalizeIcsUrl('WEBCAL://esempio.it/cal.ics')).toBe('https://esempio.it/cal.ics');
  });

  it.each([
    ['', 'vuoto'],
    ['non un indirizzo', 'testo libero'],
    ['http://esempio.it/cal.ics', 'http senza TLS'],
    ['ftp://esempio.it/cal.ics', 'altro protocollo'],
    ['https://localhost/cal.ics', 'localhost'],
    ['https://nas/cal.ics', 'nome senza dominio'],
    ['https://192.168.1.10/cal.ics', 'IPv4'],
    ['https://[::1]/cal.ics', 'IPv6'],
    ['https://stampante.local/cal.ics', 'nome interno'],
    ['https://utente:segreto@esempio.it/cal.ics', 'credenziali nell’indirizzo'],
  ])('rifiuta %s (%s)', (input) => {
    expect(normalizeIcsUrl(input)).toBeNull();
  });

  it('rifiuta indirizzi troppo lunghi', () => {
    expect(normalizeIcsUrl('https://esempio.it/' + 'a'.repeat(2000))).toBeNull();
  });
});
