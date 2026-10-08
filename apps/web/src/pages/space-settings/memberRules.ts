import type { SpaceRole } from '@ohana/shared';

export const ALL_ROLES: SpaceRole[] = ['owner', 'admin', 'member', 'viewer'];
const ASSIGNABLE_BY_ADMIN: SpaceRole[] = ['member', 'viewer'];

/** Il proprietario può cambiare chiunque; un amministratore solo membri e osservatori. */
export function canEditMember(myRole: SpaceRole | undefined, memberRole: SpaceRole): boolean {
  return myRole === 'owner' || (myRole === 'admin' && ASSIGNABLE_BY_ADMIN.includes(memberRole));
}

/** Ruoli che chi sta modificando può assegnare. */
export const assignableRoles = (myRole: SpaceRole | undefined): SpaceRole[] =>
  myRole === 'owner' ? ALL_ROLES : ASSIGNABLE_BY_ADMIN;

/** Testi della conferma per uscire dallo spazio o per rimuovere un'altra persona. */
export function leaveDialog(self: boolean) {
  return self
    ? {
        title: 'Lasciare questo spazio?',
        message: 'Non vedrai più i suoi impegni, la spesa e le spese.',
        confirmLabel: 'Esci',
        danger: true,
      }
    : {
        title: 'Rimuovere questa persona?',
        message: 'Non avrà più accesso a questo spazio.',
        confirmLabel: 'Rimuovi',
        danger: true,
      };
}

/** Messaggio per l'utente quando la rimozione fallisce. */
export const removalError = (message: string): string =>
  message.includes('ultimo owner') ? 'Sei l’unico proprietario: nomina prima un altro proprietario' : message;
