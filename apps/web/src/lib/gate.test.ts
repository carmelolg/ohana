import { describe, expect, it } from 'vitest';
import { decideGate, type GateInput } from './gate';

const base: GateInput = {
  configured: true,
  authLoading: false,
  hasSession: true,
  spacesPending: false,
  spacesFailed: false,
  spaceCount: 1,
  path: '/oggi',
};

describe('decideGate', () => {
  it("con già uno spazio entra nell'app, senza onboarding", () => {
    expect(decideGate(base)).toBe('app');
  });

  it("finché gli spazi non sono arrivati aspetta, non manda all'onboarding", () => {
    expect(decideGate({ ...base, spacesPending: true, spaceCount: 0 })).toBe('loading');
  });

  it('se la lettura degli spazi fallisce (rete assente, token da rinnovare) non è un account nuovo', () => {
    expect(decideGate({ ...base, spacesFailed: true, spaceCount: 0 })).toBe('spaces-error');
  });

  it("solo con lettura riuscita e zero spazi propone l'onboarding", () => {
    expect(decideGate({ ...base, spaceCount: 0 })).toBe('onboarding');
    expect(decideGate({ ...base, spaceCount: 0, path: '/benvenuto' })).toBe('app');
  });

  it("senza sessione mostra l'accesso, dopo aver letto quella salvata", () => {
    expect(decideGate({ ...base, authLoading: true, hasSession: false })).toBe('loading');
    expect(decideGate({ ...base, hasSession: false })).toBe('login');
  });

  it('gli inviti si aprono anche senza accesso; senza configurazione ferma tutto', () => {
    expect(decideGate({ ...base, hasSession: false, path: '/invito/abc' })).toBe('invite');
    expect(decideGate({ ...base, configured: false })).toBe('setup');
  });
});
