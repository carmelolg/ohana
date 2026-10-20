import { useRef, useState } from 'react';
import { Avatar } from '../../components/ui';
import { uploadAvatar } from '../../lib/api/profiles';
import { useAuth } from '../../lib/auth';
import { fullName } from '../../lib/color';
import { cropSquare } from '../../lib/image';
import { useToast } from '../../lib/toast';
import type { Profile } from '../../lib/types';
import { useProfileUpdate } from './useProfileUpdate';

/** Foto, nome completo ed email in alto nel profilo; la foto si cambia da qui. */
export function ProfileIdentity({ profile }: { profile: Profile }) {
  const { session } = useAuth();
  const patch = useProfileUpdate();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function changePhoto(file: File | undefined) {
    if (!file) {
      return;
    }
    setUploading(true);
    try {
      await patch({ avatar_url: await uploadAvatar(session!.user.id, await cropSquare(file)) });
    } catch (e) {
      toast('Foto non caricata: ' + (e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="profile-id">
      <Avatar
        size={72}
        first={profile.first_name}
        last={profile.last_name}
        nickname={profile.nickname}
        url={profile.avatar_url}
      />
      <div className="profile-id-text">
        <b>{fullName(profile) || 'Il mio profilo'}</b>
        <span className="muted">{profile.email}</span>
        <button
          className="btn ghost small"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          aria-busy={uploading}
        >
          {uploading ? 'Caricamento foto…' : 'Cambia foto'}
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
  );
}
