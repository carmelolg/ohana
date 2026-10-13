import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { connectCalendar, syncCalendarNow } from '../../lib/api/calendarImports';
import { useToast } from '../../lib/toast';

interface Params {
  userId: string;
  defaultSpaceId: string;
}

/** Stato e azione del modulo «Importa un calendario»: collega, sincronizza subito, avvisa l'esito. */
export function useConnectCalendar({ userId, defaultSpaceId }: Params) {
  const toast = useToast();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [spaceId, setSpaceId] = useState(defaultSpaceId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const space = spaceId || defaultSpaceId;

  async function submit(): Promise<boolean> {
    setError('');
    setBusy(true);
    try {
      const id = await connectCalendar({ spaceId: space, userId, name, url });
      setName('');
      setUrl('');
      await qc.invalidateQueries({ queryKey: ['calendar-imports'] });
      const outcome = await syncCalendarNow(id);
      await qc.invalidateQueries({ queryKey: ['calendar-imports'] });
      toast(
        outcome.ok
          ? `Calendario collegato · ${outcome.written ?? 0} impegni`
          : (outcome.error ?? 'Collegato'),
      );
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  return { name, setName, url, setUrl, spaceId: space, setSpaceId, busy, error, submit };
}
