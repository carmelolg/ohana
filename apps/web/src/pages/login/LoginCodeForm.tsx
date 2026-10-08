import { useState } from 'react';
import { verifyEmailCode } from '../../lib/api/auth';
import { isCompleteLoginCode, normalizeLoginCode } from '../../lib/loginCode';

/** Seconda via d'accesso: il codice dell'email si inserisce nella stessa app, utile nella PWA installata dove il link si aprirebbe nel browser. */
export function LoginCodeForm({ email }: { email: string }) {
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      await verifyEmailCode(email, code);
    } catch {
      // Il messaggio tecnico di Supabase non aiuta l'utente: il caso reale è codice errato o scaduto.
      setErr('Codice non valido o scaduto. Controlla l’email o richiedine uno nuovo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="stack" onSubmit={submit}>
      <label className="muted" htmlFor="login-code">
        Oppure inserisci il codice numerico che trovi nell’email
      </label>
      <input
        id="login-code"
        className="input"
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="Codice"
        value={code}
        onChange={(e) => setCode(normalizeLoginCode(e.target.value))}
      />
      <button className="btn" type="submit" disabled={busy || !isCompleteLoginCode(code)}>
        Entra con il codice
      </button>
      {err && (
        <p className="error" role="alert">
          {err}
        </p>
      )}
    </form>
  );
}
