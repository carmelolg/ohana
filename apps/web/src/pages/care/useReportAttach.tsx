import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TimelineAction } from '../../lib/timeline';
import type { CareReminderEvent } from '../../lib/data';
import { useMutate } from '../../lib/data';
import { useToast } from '../../lib/toast';
import type { CareEntry, CareThread } from '../../lib/types';
import { attachReports, isVisitEvent, type ReportTarget } from './attachReport';

/**
 * «Allega referto» sulle righe della cronologia: tassello esistente → solo i file; visita → schermata di
 * chiusura (che registra l'esito); esame in calendario → tassello «Esame» legato all'impegno con i file.
 * `input` è il selettore di file nascosto da montare nella pagina.
 */
export function useReportAttach(thread: CareThread | undefined, canWrite: boolean) {
  const mutate = useMutate();
  const toast = useToast();
  const nav = useNavigate();
  const input = useRef<HTMLInputElement>(null);
  const [target, setTarget] = useState<ReportTarget | null>(null);

  const pick = (t: ReportTarget) => {
    setTarget(t);
    input.current?.click();
  };

  async function upload(files: File[]) {
    if (!thread || !target || files.length === 0) {
      return;
    }
    try {
      const failed = await attachReports(mutate, thread, target, files);
      toast(
        failed.length ? `Non ho caricato: ${failed.join(', ')} (serve la connessione)` : 'Referto allegato',
      );
    } catch {
      toast('Non riesco ad allegare il referto. Riprova.');
    }
    setTarget(null);
  }

  const actions = useMemo(
    () =>
      canWrite
        ? {
            entry: (entry: CareEntry): TimelineAction => ({
              label: '📎 Allega referto',
              ariaLabel: `Allega referto a ${entry.title}`,
              onClick: () => pick({ kind: 'entry', entryId: entry.id, title: entry.title }),
            }),
            event: (event: CareReminderEvent): TimelineAction =>
              isVisitEvent(event)
                ? {
                    label: 'Registra esito e allega',
                    ariaLabel: `Registra l'esito di ${event.title} e allega il referto`,
                    onClick: () => nav(`/cura/visita/${event.id}`),
                  }
                : {
                    label: '📎 Allega referto',
                    ariaLabel: `Allega referto a ${event.title}`,
                    onClick: () => pick({ kind: 'event', event }),
                  },
          }
        : undefined,
    // `pick` e `nav` dipendono solo da ref e router, stabili per la vita della pagina
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canWrite],
  );

  const picker = (
    <input
      ref={input}
      type="file"
      hidden
      multiple
      accept="image/*,application/pdf"
      aria-label="Scegli il referto da allegare"
      onChange={(e) => {
        void upload(Array.from(e.target.files ?? []));
        e.target.value = '';
      }}
    />
  );
  return { actions, picker };
}
