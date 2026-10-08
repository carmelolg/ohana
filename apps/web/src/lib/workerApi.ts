import { WORKER_URL } from './config';
import { supabase } from './supabase';

export interface LlmFields {
  docType?: string;
  supplier?: string | null;
  amount?: number | null;
  dueDate?: string | null;
}

/** Fallback facoltativo: invia al Worker SOLO il testo letto dall'OCR (mai l'immagine) per migliorare i campi. */
export async function llmParse(text: string): Promise<LlmFields> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error('Accesso richiesto');
  }
  const r = await fetch(`${WORKER_URL}/scan/parse`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: text.slice(0, 6000) }),
  });
  if (!r.ok) {
    throw new Error(
      r.status === 403
        ? 'Fallback AI non attivo'
        : r.status === 501
          ? 'Fallback AI non configurato sul server'
          : `Errore ${r.status}`,
    );
  }
  return (await r.json()) as LlmFields;
}
