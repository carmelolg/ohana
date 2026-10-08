import { doneActionPatch, snoozeActionPatch, startOfDayRome, type EventPatch } from '@ohana/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useMutate } from './data';
import { useToast } from './toast';
import type { EventRow } from './types';

/** Azioni rapide su un impegno (usate da swipe, pulsanti e dettaglio). */
export function useEventActions() {
  const mutate = useMutate();
  const toast = useToast();
  const qc = useQueryClient();
  const nav = useNavigate();

  const apply = async (ev: EventRow, patch: EventPatch) => {
    const optimistic = [
      {
        key: ['events'],
        patch: (old: unknown) =>
          Array.isArray(old) ? old.map((e: EventRow) => (e.id === ev.id ? { ...e, ...patch } : e)) : old,
      },
    ];
    await mutate(
      { table: 'events', action: 'update', payload: patch as Record<string, unknown>, match: { id: ev.id } },
      optimistic,
    );
    void qc.invalidateQueries({ queryKey: ['event', ev.id] });
  };

  const undo = (ev: EventRow) => () =>
    void apply(ev, {
      status: ev.status,
      starts_at: ev.starts_at,
      ends_at: ev.ends_at,
      last_done_at: ev.last_done_at,
    });

  return {
    async done(ev: EventRow) {
      await apply(ev, doneActionPatch(ev, new Date()));
      // visita conclusa → invito a scrivere «com'è andata»
      if (ev.categories?.slug === 'visita' && !ev.rrule) {
        toast({
          msg: 'Visita conclusa',
          action: { label: 'Com’è andata', run: () => nav(`/evento/${ev.id}`) },
        });
        return;
      }
      toast({
        msg: ev.rrule ? 'Fatto · prossima occorrenza aggiornata' : 'Segnato come fatto',
        action: { label: 'Annulla', run: undo(ev) },
      });
    },
    /** Toglie la spunta a una faccenda fatta oggi: torna da fare oggi. */
    async undoChore(ev: EventRow, today: Date) {
      await apply(ev, { starts_at: startOfDayRome(today).toISOString(), last_done_at: null });
    },
    async snooze(ev: EventRow, minutes = 1440) {
      const patch = snoozeActionPatch(ev, minutes);
      if (!patch) {
        return toast('Impegno ricorrente: modifica la serie per cambiare l’orario');
      }
      await apply(ev, patch);
      toast({
        msg: minutes >= 1440 ? 'Rimandato a domani' : 'Rimandato di 1 ora',
        action: { label: 'Annulla', run: undo(ev) },
      });
    },
    async remove(ev: EventRow) {
      await mutate({ table: 'events', action: 'delete', match: { id: ev.id } }, [
        {
          key: ['events'],
          patch: (old) => (Array.isArray(old) ? old.filter((e: EventRow) => e.id !== ev.id) : old),
        },
      ]);
      toast('Impegno eliminato');
    },
  };
}
