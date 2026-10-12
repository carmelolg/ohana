import { useEffect, useState } from 'react';
import type { Profile } from '../../lib/types';
import { ProfileIdentity } from './ProfileIdentity';
import { SettingsCard } from '../../components/SettingsCard';
import { useProfileUpdate } from './useProfileUpdate';

/** Foto, nome, cognome, soprannome ed email. Ogni campo si salva quando si esce dal campo. */
export function ProfileSection({ profile }: { profile: Profile }) {
  const patch = useProfileUpdate();
  const [first, setFirst] = useState(profile.first_name);
  const [last, setLast] = useState(profile.last_name);
  const [nick, setNick] = useState(profile.nickname ?? '');

  // ogni campo si risincronizza solo quando cambia il proprio valore salvato (altrimenti si perde ciò che si sta scrivendo)
  useEffect(() => setFirst(profile.first_name), [profile.first_name]);
  useEffect(() => setLast(profile.last_name), [profile.last_name]);
  useEffect(() => setNick(profile.nickname ?? ''), [profile.nickname]);

  return (
    <SettingsCard id="profilo" title="Il tuo profilo" hint="Come ti vedono gli altri membri.">
      <ProfileIdentity profile={profile} />
      <div className="form-grid">
        <label className="field">
          <span className="label">Nome</span>
          <input
            className="input"
            aria-label="Nome"
            placeholder="Nome"
            value={first}
            onChange={(e) => setFirst(e.target.value)}
            onBlur={() => first !== profile.first_name && patch({ first_name: first.trim() })}
          />
        </label>
        <label className="field">
          <span className="label">Cognome</span>
          <input
            className="input"
            aria-label="Cognome"
            placeholder="Cognome"
            value={last}
            onChange={(e) => setLast(e.target.value)}
            onBlur={() => last !== profile.last_name && patch({ last_name: last.trim() })}
          />
        </label>
        <label className="field form-wide">
          <span className="label">Soprannome</span>
          <input
            className="input"
            aria-label="Soprannome"
            placeholder="Soprannome (facoltativo)"
            maxLength={40}
            value={nick}
            onChange={(e) => setNick(e.target.value)}
            onBlur={() =>
              nick.trim() !== (profile.nickname ?? '') && patch({ nickname: nick.trim() || null })
            }
          />
          <span className="muted set-hint">
            Se lo imposti, gli altri vedranno solo questo (nell’app, nelle email e nei promemoria) al posto di
            «{`${first} ${last}`.trim() || 'Nome Cognome'}».
          </span>
        </label>
        <label className="field form-wide">
          <span className="label">Email</span>
          <input className="input" aria-label="Email" value={profile.email} readOnly />
        </label>
      </div>
      <p className="muted set-hint">Le modifiche si salvano quando esci dal campo.</p>
    </SettingsCard>
  );
}
