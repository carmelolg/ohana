import { CalendarDays } from 'lucide-react';
import { useMutate } from '../../lib/data';
import { useToast } from '../../lib/toast';
import type { EventForm } from './useEventForm';

/**
 * Avviso su un impegno importato: titolo e orario sono del calendario d'origine, il resto è nostro. Se luogo o note sono
 * stati cambiati qui, «Ripristina» toglie il segno e la prossima sincronizzazione (pochi minuti) rimette quelli del calendario.
 */
export function ImportedNotice({ form }: { form: EventForm }) {
  const mutate = useMutate();
  const toast = useToast();
  const { existing, writable } = form;
  const edited = existing?.local_overrides ?? [];
  if (!existing) {
    return null;
  }
  const restore = async () => {
    await mutate({
      table: 'events',
      action: 'update',
      payload: { local_overrides: [], location_lat: null, location_lng: null },
      match: { id: existing.id },
    });
    toast('Luogo e note torneranno quelli del calendario tra pochi minuti');
    form.back();
  };
  return (
    <aside className="imported-notice" aria-label="Impegno importato">
      <CalendarDays size={20} aria-hidden />
      <div>
        <strong>Importato da un calendario esterno</strong>
        <p>
          Titolo e orario si cambiano nel calendario d’origine e si aggiornano da soli. Tutto il resto (luogo,
          note, categoria, collegamenti, promemoria) lo gestisci qui.
        </p>
        {writable && edited.length > 0 && (
          <button type="button" className="btn ghost small" onClick={() => void restore()}>
            Ripristina luogo e note dal calendario
          </button>
        )}
      </div>
    </aside>
  );
}
