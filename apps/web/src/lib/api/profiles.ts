import { supabase } from '../supabase';
import type { Profile } from '../types';
import { unwrap } from './result';

export async function updateProfile(
  userId: string,
  patch: Partial<Omit<Profile, 'id' | 'email'>>,
): Promise<void> {
  unwrap(await supabase.from('profiles').update(patch).eq('id', userId));
}

/** Carica l'avatar nel bucket pubblico `avatars` (cartella = id utente) e restituisce l'URL pubblico. */
export async function uploadAvatar(userId: string, image: Blob): Promise<string> {
  const path = `${userId}/avatar-${Date.now()}.jpg`;
  unwrap(await supabase.storage.from('avatars').upload(path, image, { contentType: 'image/jpeg' }));
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}
