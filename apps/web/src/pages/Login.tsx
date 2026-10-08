import { useState } from 'react';
import { sendMagicLink, signInWithGoogle } from '../lib/api/auth';
import { LoginCodeForm } from './login/LoginCodeForm';

export function LoginForm({ redirectTo, defaultEmail = '' }: { redirectTo?: string; defaultEmail?: string }) {
  const [email, setEmail] = useState(defaultEmail);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const target = redirectTo ?? window.location.origin + '/oggi';

  async function magic(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      await sendMagicLink(email, target);
      setSent(true);
    } catch (e) {
      setErr('Non riesco a inviare il link: ' + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function google() {
    try {
      await signInWithGoogle(target);
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  if (sent) {
    return (
      <div className="stack">
        <div className="banner" role="status">
          Link inviato a <strong>{email}</strong>. Aprilo da questo dispositivo per entrare.
        </div>
        <LoginCodeForm email={email} />
      </div>
    );
  }
  return (
    <form className="stack" onSubmit={magic}>
      <label className="sr-only" htmlFor="email">
        Email
      </label>
      <input
        id="email"
        className="input"
        type="email"
        required
        autoComplete="email"
        inputMode="email"
        placeholder="La tua email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button className="btn" type="submit" disabled={busy || !email}>
        Invia link di accesso
      </button>
      <button className="btn ghost" type="button" onClick={google}>
        Continua con Google
      </button>
      {err && (
        <p className="error" role="alert">
          {err}
        </p>
      )}
    </form>
  );
}

export function LoginPage() {
  return (
    <div className="login" role="main">
      <div className="hero">
        <img src="/icons/icon.svg" alt="Ohana" />
        <h1>Ohana</h1>
        <p>Impegni, spesa, scadenze e spese di famiglia, condivisi con chi vuoi tu.</p>
      </div>
      <div className="actions">
        <LoginForm />
        <p className="muted" style={{ fontSize: 13, textAlign: 'center' }}>
          Niente password: ti mandiamo un link e un codice via email.
        </p>
      </div>
    </div>
  );
}
