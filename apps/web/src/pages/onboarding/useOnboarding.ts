import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { SPACE_HUES, toggleFeature, type SpaceFeature } from '@ohana/shared';
import { createSpace, updateSpace } from '../../lib/api/spaces';
import { updateProfile } from '../../lib/api/profiles';
import { useAuth } from '../../lib/auth';
import { useSpace } from '../../lib/data';
import { useBusyAction } from '../../lib/useBusyAction';

export type OnboardingStep = 'profile' | 'space' | 'invite' | 'done';

/** Stato e scritture del primo accesso: persona → spazio → invito → pronto. */
export function useOnboarding() {
  const { session, profile, refreshProfile } = useAuth();
  const { setSelected } = useSpace();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [step, setStep] = useState<OnboardingStep>('profile');
  const [first, setFirst] = useState(profile?.first_name ?? '');
  const [last, setLast] = useState(profile?.last_name ?? '');
  const [nick, setNick] = useState('');
  const [name, setName] = useState('Casa mia');
  const [hue, setHue] = useState<number>(SPACE_HUES[0]);
  // tutte accese: il design ne parte con tre, ma così chi arriva da un invito o dai test non perde Cura e Documenti
  const [disabled, setDisabled] = useState<string[]>([]);
  const [spaceId, setSpaceId] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const { busy: saving, run } = useBusyAction();

  const toggle = (key: SpaceFeature) => setDisabled((d) => toggleFeature(d, key, d.includes(key)));

  /** Salva la persona e crea lo spazio: serve prima dell'invito, che ha bisogno dello spazio. */
  async function createFirstSpace() {
    await run(saveFirstSpace);
  }

  async function saveFirstSpace() {
    const uid = session!.user.id;
    const id = spaceId ?? crypto.randomUUID();
    try {
      await updateProfile(uid, {
        first_name: first.trim(),
        last_name: last.trim(),
        nickname: nick.trim() || null,
      });
      if (!spaceId) {
        await createSpace({ id, name: name.trim(), colorHue: hue, createdBy: uid });
      }
      await updateSpace(id, { name: name.trim(), color_hue: hue, disabled_features: disabled });
    } catch (e) {
      setErr((e as Error).message);
      return;
    }
    setErr('');
    setSpaceId(id);
    await refreshProfile();
    await qc.invalidateQueries({ queryKey: ['spaces'] });
    await qc.invalidateQueries({ queryKey: ['categories'] }); // le categorie predefinite le crea il database con lo spazio
    setSelected(id);
    setStep('invite');
  }

  const finish = () => nav('/oggi', { replace: true });

  return {
    step,
    setStep,
    spaceId,
    err,
    person: { first, setFirst, last, setLast, nick, setNick },
    space: { name, setName, hue, setHue, disabled, toggle },
    createFirstSpace,
    saving,
    finish,
  };
}
