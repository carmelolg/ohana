export type GateView = 'setup' | 'loading' | 'invite' | 'login' | 'spaces-error' | 'onboarding' | 'app';

export interface GateInput {
  configured: boolean;
  authLoading: boolean;
  hasSession: boolean;
  /** Gli spazi non sono ancora arrivati (né dalla rete né dalla cache). */
  spacesPending: boolean;
  /** La lettura degli spazi è fallita e non c'è nulla in cache. */
  spacesFailed: boolean;
  spaceCount: number;
  path: string;
}

/**
 * Cosa mostrare all'avvio. L'onboarding è solo per chi ha davvero zero spazi: una lettura in corso o fallita
 * (rete assente, token da rinnovare) non dice nulla, e trattarla come «zero spazi» farebbe ricreare lo spazio.
 */
export function decideGate(i: GateInput): GateView {
  if (!i.configured) {
    return 'setup';
  }
  if (i.authLoading) {
    return 'loading';
  }
  if (i.path.startsWith('/invito/')) {
    return 'invite';
  }
  if (!i.hasSession) {
    return 'login';
  }
  if (i.spaceCount > 0) {
    return 'app';
  }
  if (i.spacesPending) {
    return 'loading';
  }
  if (i.spacesFailed) {
    return 'spaces-error';
  }
  return i.path.startsWith('/benvenuto') ? 'app' : 'onboarding';
}
