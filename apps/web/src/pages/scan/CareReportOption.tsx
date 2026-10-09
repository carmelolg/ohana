import { useEffect } from 'react';
import { extractReadings, formatReading, normalizeText, suggestThread } from '@ohana/shared';
import { useCareThreads, useSpaceRecipients } from '../../lib/data';
import type { ScanForm } from './useScanForm';

const SNIPPET_CHARS = 600;

/**
 * Per un referto in uno spazio con Cura: propone il filone (dalla specialità citata nel testo) e i valori letti.
 * Aggiunge un tassello «esame» solo se l'utente lo accetta.
 */
export function CareReportOption({ form, text }: { form: ScanForm; text: string }) {
  const recipients = useSpaceRecipients(form.spaceId);
  const { data: allThreads = [] } = useCareThreads();
  const threads = allThreads.filter(
    (t) => t.status === 'attivo' && recipients.some((r) => r.id === t.recipient_id),
  );
  const isReport = form.docType === 'referto' && threads.length > 0;
  const suggested = isReport
    ? suggestThread(
        threads,
        { title: text.slice(0, SNIPPET_CHARS), contact_id: null },
        form.supplier,
        normalizeText,
      )
    : null;
  const { careThreadId, setCareThreadId } = form;

  // se cambia tipo o spazio la scelta precedente non vale più
  useEffect(() => {
    if (!isReport && careThreadId) {
      setCareThreadId('');
    }
  }, [isReport, careThreadId, setCareThreadId]);

  if (!isReport) {
    return null;
  }
  const values = Object.entries(extractReadings(text));
  return (
    <div className="group" style={{ marginTop: 18 }}>
      <label className="kv" style={{ minHeight: 48 }}>
        <span>Aggiungi al filone di cura</span>
        <input
          type="checkbox"
          className="toggle-input"
          checked={!!careThreadId}
          onChange={(e) => setCareThreadId(e.target.checked ? (suggested ?? threads[0]).id : '')}
        />
      </label>
      {careThreadId && (
        <div className="stack" style={{ padding: '8px 0' }}>
          <select
            className="input"
            aria-label="Filone di cura"
            value={careThreadId}
            onChange={(e) => setCareThreadId(e.target.value)}
          >
            {threads.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
          {values.length > 0 && (
            <p className="muted" style={{ fontSize: 13 }}>
              Valori letti: {values.map(([k, v]) => formatReading(k, v)).join(' · ')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
