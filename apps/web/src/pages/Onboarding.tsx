import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { SPACE_HUES } from '@ohana/shared';
import { createSpace } from '../lib/api/spaces';
import { updateProfile } from '../lib/api/profiles';
import { useAuth } from '../lib/auth';
import { useSpace } from '../lib/data';
import { HueSwatches } from '../components/HueSwatches';

type FieldKey = 'first' | 'last' | 'nick' | 'name';

const FIELDS: {
  label: string;
  placeholder: string;
  required?: boolean;
  maxLength?: number;
  state: FieldKey;
}[] = [
  { label: 'Nome', placeholder: 'Nome', required: true, state: 'first' },
  { label: 'Cognome', placeholder: 'Cognome', state: 'last' },
  {
    label: 'Soprannome',
    placeholder: 'Soprannome (facoltativo, è il nome che vedranno gli altri)',
    maxLength: 40,
    state: 'nick',
  },
  { label: 'Nome dello spazio', placeholder: 'Nome dello spazio', required: true, state: 'name' },
];

/** Primo accesso: nome della persona e del suo primo spazio. */
export function Onboarding() {
  const { session, profile, refreshProfile } = useAuth();
  const { setSelected } = useSpace();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [first, setFirst] = useState(profile?.first_name ?? '');
  const [last, setLast] = useState(profile?.last_name ?? '');
  const [nick, setNick] = useState('');
  const [name, setName] = useState('Casa mia');
  const [hue, setHue] = useState<number>(SPACE_HUES[0]);
  const [err, setErr] = useState('');
  const values = { first, last, nick, name };
  const setters = { first: setFirst, last: setLast, nick: setNick, name: setName };

  async function go(e: React.FormEvent) {
    e.preventDefault();
    const uid = session!.user.id;
    const id = crypto.randomUUID();
    try {
      await updateProfile(uid, {
        first_name: first.trim(),
        last_name: last.trim(),
        nickname: nick.trim() || null,
      });
      await createSpace({ id, name: name.trim(), colorHue: hue, createdBy: uid });
    } catch (e) {
      return setErr((e as Error).message);
    }
    await refreshProfile();
    await qc.invalidateQueries({ queryKey: ['spaces'] });
    await qc.invalidateQueries({ queryKey: ['categories'] }); // le categorie predefinite le crea il database con lo spazio
    setSelected(id);
    nav('/oggi', { replace: true });
  }

  return (
    <div className="login" role="main">
      <form className="hero" onSubmit={go}>
        <h1>Benvenuto</h1>
        <p>
          Come ti chiami? E come vuoi chiamare il tuo primo spazio? Potrai crearne altri e invitare i tuoi
          familiari.
        </p>
        {FIELDS.map(({ label, placeholder, required, maxLength, state }) => (
          <input
            key={label}
            className="input"
            required={required}
            placeholder={placeholder}
            maxLength={maxLength}
            value={values[state]}
            onChange={(e) => setters[state](e.target.value)}
            aria-label={label}
          />
        ))}
        <HueSwatches value={hue} onChange={setHue} />
        {err && <p className="error">{err}</p>}
        <button className="btn accent" type="submit">
          Inizia
        </button>
      </form>
    </div>
  );
}
