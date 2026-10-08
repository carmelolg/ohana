/** Trasforma l'esito `{ error }` del client Supabase in un'eccezione, così i chiamanti usano `try/catch` come per ogni altro errore. */
export function unwrap<T extends { error: { message: string } | null }>(result: T): T {
  if (result.error) {
    throw new Error(result.error.message);
  }
  return result;
}
