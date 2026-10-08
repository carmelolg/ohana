import { useEffect, useState } from 'react';
import { useEmergencyAll, useSpace } from '../../lib/data';
import { loadSnapshot, saveSnapshot, type Snapshot } from '../../lib/emergency-cache';

/**
 * Dati di emergenza «vivi» se c'è rete, altrimenti l'ultima copia salvata sul dispositivo.
 * Ogni dato fresco aggiorna la copia locale (e quella del service worker).
 */
export function useEmergencyData() {
  const { spaces } = useSpace();
  const { data: live, isError, isFetching } = useEmergencyAll();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);

  useEffect(() => {
    void loadSnapshot().then(setSnapshot);
  }, []);

  useEffect(() => {
    if (!live || spaces.length === 0) {
      return;
    }
    const fresh: Snapshot = {
      savedAt: new Date().toISOString(),
      infos: live,
      spaces: spaces.map((s) => ({ id: s.id, name: s.name, color_hue: s.color_hue })),
    };
    void saveSnapshot(fresh).then(() => setSnapshot(fresh));
  }, [live, spaces]);

  const spaceList = spaces.length
    ? spaces.map((s) => ({ id: s.id, name: s.name, color_hue: s.color_hue }))
    : (snapshot?.spaces ?? []);
  return {
    infos: live ?? snapshot?.infos ?? [],
    spaceList,
    savedAt: snapshot?.savedAt,
    offline: !navigator.onLine || (isError && !live),
    loading: isFetching && !live,
  };
}
