import { useState } from 'react';
import { updateProfile } from '../../lib/api/profiles';
import { useAuth } from '../../lib/auth';
import { ProfileStep } from '../onboarding/Steps';

/** Chi arriva da un invito deve presentarsi prima di entrare: gli altri membri vedranno nome e cognome. */
export function JoinProfile() {
  const { session, profile, refreshProfile } = useAuth();
  const [first, setFirst] = useState(profile?.first_name ?? '');
  const [last, setLast] = useState(profile?.last_name ?? '');
  const [nick, setNick] = useState(profile?.nickname ?? '');
  const [err, setErr] = useState('');

  async function save() {
    try {
      await updateProfile(session!.user.id, {
        first_name: first.trim(),
        last_name: last.trim(),
        nickname: nick.trim() || null,
      });
      await refreshProfile();
    } catch {
      setErr('Non riesco a salvare i tuoi dati. Riprova.');
    }
  }

  return (
    <div className="login" role="main">
      <ProfileStep
        person={{ first, setFirst, last, setLast, nick, setNick }}
        requireLast
        onNext={() => void save()}
      />
      {err && (
        <p className="error" role="alert">
          {err}
        </p>
      )}
    </div>
  );
}
