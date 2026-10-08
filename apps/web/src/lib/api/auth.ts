import { supabase } from '../supabase';
import { unwrap } from './result';

/** Invia il link di accesso via email (nessuna password). */
export async function sendMagicLink(email: string, redirectTo: string): Promise<void> {
  unwrap(
    await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: redirectTo } }),
  );
}

export async function signInWithGoogle(redirectTo: string): Promise<void> {
  unwrap(await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } }));
}
