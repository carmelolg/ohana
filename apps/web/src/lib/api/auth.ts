import { supabase } from '../supabase';
import { unwrap } from './result';

/** Invia il link di accesso via email (nessuna password). */
export async function sendMagicLink(email: string, redirectTo: string): Promise<void> {
  unwrap(
    await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: redirectTo } }),
  );
}

/** Completa l'accesso con il codice dell'email: la sessione nasce dove si inserisce il codice (anche nella PWA installata). */
export async function verifyEmailCode(email: string, code: string): Promise<void> {
  unwrap(await supabase.auth.verifyOtp({ email: email.trim(), token: code, type: 'email' }));
}

export async function signInWithGoogle(redirectTo: string): Promise<void> {
  unwrap(await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } }));
}
