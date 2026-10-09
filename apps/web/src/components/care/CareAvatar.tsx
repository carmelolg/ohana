import { careName } from '@ohana/shared';
import { initials } from '../../lib/color';
import { useCareFileUrl, useSpace } from '../../lib/data';
import type { CareRecipient } from '../../lib/types';

/** Foto della persona assistita (se c'è) o le iniziali. */
export function CareAvatar({ recipient, size = 56 }: { recipient: CareRecipient; size?: number }) {
  const { data: carePhoto } = useCareFileUrl(recipient.photo_path);
  const { memberProfile } = useSpace();
  // senza una foto di cura, se è un membro di Ohana si usa la foto del suo profilo
  const url = carePhoto ?? memberProfile(recipient.user_id)?.avatar_url;
  return (
    <span
      className="care-avatar"
      style={{ width: size, height: size, fontSize: size * 0.23 }}
      role="img"
      aria-label={careName(recipient)}
    >
      {url ? <img src={url} alt="" /> : initials(recipient.first_name, recipient.last_name)}
    </span>
  );
}
