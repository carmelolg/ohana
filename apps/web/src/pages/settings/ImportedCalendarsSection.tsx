import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { formatDay, formatTime } from '@ohana/shared';
import { disconnectCalendar, syncCalendarNow } from '../../lib/api/calendarImports';
import { useAuth } from '../../lib/auth';
import { useCalendarImports, useSpace } from '../../lib/data';
import type { CalendarImport } from '../../lib/data';
import { useDialog } from '../../lib/dialog';
import { useToast } from '../../lib/toast';
import { ImportCalendarForm } from './ImportCalendarForm';

const lastSync = (c: CalendarImport): string => {
  if (!c.last_synced_at) {
    return 'Non ancora sincronizzato';
  }
  const at = new Date(c.last_synced_at);
  return `Aggiornato ${formatDay(at)} alle ${formatTime(at)}`;
};

function ImportRow({
  item,
  spaceName,
  writable,
}: {
  item: CalendarImport;
  spaceName?: string;
  writable: boolean;
}) {
  const toast = useToast();
  const dialog = useDialog();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ['calendar-imports'] });

  async function syncNow() {
    setBusy(true);
    try {
      const outcome = await syncCalendarNow(item.id);
      toast(outcome.ok ? 'Calendario aggiornato' : (outcome.error ?? 'Sincronizzazione non riuscita'));
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
      void refresh();
    }
  }

  async function remove() {
    const confirmed = await dialog.confirm({
      title: `Scollegare «${item.name}»?`,
      message:
        'Gli impegni importati da questo calendario verranno rimossi da Ohana. Il calendario d’origine non cambia.',
      confirmLabel: 'Scollega',
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    try {
      await disconnectCalendar(item.id);
      await qc.invalidateQueries({ queryKey: ['events'] });
      void refresh();
    } catch (e) {
      toast((e as Error).message);
    }
  }

  return (
    <div className="stack" style={{ padding: '10px 0' }}>
      <div className="kv">
        <span>{item.name}</span>
        <span className="muted">{spaceName}</span>
      </div>
      {item.last_error ? (
        <p className="error" role="alert">
          {item.last_error}
        </p>
      ) : (
        <span className="muted" style={{ fontSize: 13 }}>
          {lastSync(item)}
        </span>
      )}
      {writable && (
        <div className="hstack">
          <button className="btn ghost small" onClick={() => void syncNow()} disabled={busy}>
            {busy ? 'Aggiorno…' : 'Sincronizza ora'}
          </button>
          <button
            className="btn danger small"
            onClick={() => void remove()}
            aria-label={`Scollega ${item.name}`}
          >
            Scollega
          </button>
        </div>
      )}
    </div>
  );
}

/** Calendari esterni (Google, Apple…) importati in Ohana: si aggiornano da soli ogni pochi minuti. In app sono in sola lettura. */
export function ImportedCalendarsSection() {
  const { session } = useAuth();
  const { spaceById, canWrite } = useSpace();
  const { data: imports = [] } = useCalendarImports();
  return (
    <>
      <div className="label section-label">Importa un calendario</div>
      <p className="muted" style={{ fontSize: 14 }}>
        Porta in Ohana gli impegni di un calendario che già usi. In Google Calendar apri le impostazioni del
        calendario, poi «Integra calendario» e copia l’«Indirizzo segreto in formato iCal». In Apple
        Calendario condividi il calendario come pubblico e copia il link. Gli impegni importati si aggiornano
        da soli e non si modificano qui: cambiali nel calendario d’origine.
      </p>
      {imports.map((c) => (
        <ImportRow
          key={c.id}
          item={c}
          spaceName={spaceById(c.space_id)?.name}
          writable={canWrite(c.space_id)}
        />
      ))}
      <ImportCalendarForm userId={session!.user.id} />
    </>
  );
}
