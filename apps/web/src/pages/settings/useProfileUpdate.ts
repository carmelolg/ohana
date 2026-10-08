import { updateProfile } from '../../lib/api/profiles';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';

type ProfileChanges = Parameters<typeof updateProfile>[1];

/** Salva una modifica del profilo e ricarica il profilo; l'errore diventa un avviso. */
export function useProfileUpdate() {
  const { session, refreshProfile } = useAuth();
  const toast = useToast();
  const userId = session!.user.id;
  return async function patch(changes: ProfileChanges): Promise<void> {
    try {
      await updateProfile(userId, changes);
      await refreshProfile();
    } catch (e) {
      toast((e as Error).message);
    }
  };
}
