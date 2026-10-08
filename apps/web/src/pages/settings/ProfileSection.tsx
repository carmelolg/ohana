import { useEffect, useRef, useState } from 'react';
import { Avatar } from '../../components/ui';
import { uploadAvatar } from '../../lib/api/profiles';
import { useAuth } from '../../lib/auth';
import { cropSquare } from '../../lib/image';
import { useToast } from '../../lib/toast';
import type { Profile } from '../../lib/types';
import { useProfileUpdate } from './useProfileUpdate';

/** Foto, nome, cognome, soprannome ed email. Ogni campo si salva quando si esce dal campo. */
export function ProfileSection({ profile }: { profile: Profile }) {
  const { session } = useAuth();
  const patch = useProfileUpdate();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [first, setFirst] = useState(profile.first_name);
  const [last, setLast] = useState(profile.last_name);
  const [nick, setNick] = useState(profile.nickname ?? '');

  // ogni campo si risincronizza solo quando cambia il proprio valore salvato (altrimenti si perde ciò che si sta scrivendo)
  useEffect(() => setFirst(profile.first_name), [profile.first_name]);
  useEffect(() => setLast(profile.last_name), [profile.last_name]);
  useEffect(() => setNick(profile.nickname ?? ''), [profile.nickname]);

  async function changePhoto(file: File | undefined) {
    if (!file) {
      return;
    }
    try {
      await patch({ avatar_url: await uploadAvatar(session!.user.id, await cropSquare(file)) });
    } catch (e) {
      toast('Foto non caricata: ' + (e as Error).message);
    }
  }

  return (
    <>
      <div className="hstack" style={{ marginTop: 18 }}>
        <Avatar
          size={72}
          first={profile.first_name}
          last={profile.last_name}
          nickname={profile.nickname}
          url={profile.avatar_url}
        />
        <div>
          <button className="btn ghost small" onClick={() => fileRef.current?.click()}>
            Cambia foto
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => changePhoto(e.target.files?.[0])}
          />
        </div>
      </div>
      <div className="stack" style={{ marginTop: 14 }}>
        <input
          className="input"
          aria-label="Nome"
          placeholder="Nome"
          value={first}
          onChange={(e) => setFirst(e.target.value)}
          onBlur={() => first !== profile.first_name && patch({ first_name: first.trim() })}
        />
        <input
          className="input"
          aria-label="Cognome"
          placeholder="Cognome"
          value={last}
          onChange={(e) => setLast(e.target.value)}
          onBlur={() => last !== profile.last_name && patch({ last_name: last.trim() })}
        />
        <div className="field">
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
          <span className="muted" style={{ fontSize: 13 }}>
            Se lo imposti, gli altri vedranno solo questo (nell’app, nelle email e nei promemoria) al posto di
            «{`${first} ${last}`.trim() || 'Nome Cognome'}».
          </span>
        </div>
        <input className="input" aria-label="Email" value={profile.email} readOnly />
      </div>
    </>
  );
}
