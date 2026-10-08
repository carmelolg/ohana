/** Supabase genera codici da 6 a 10 cifre (`otp_length`): il locale usa 6, il progetto online può averne 8. */
const MIN_LOGIN_CODE_LENGTH = 6;
const MAX_LOGIN_CODE_LENGTH = 10;

/** Tiene solo le cifre: chi copia il codice dall'email spesso incolla anche spazi o trattini. */
export function normalizeLoginCode(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, MAX_LOGIN_CODE_LENGTH);
}

export function isCompleteLoginCode(code: string): boolean {
  return code.length >= MIN_LOGIN_CODE_LENGTH;
}
