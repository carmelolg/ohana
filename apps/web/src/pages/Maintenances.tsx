import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MAINTENANCE_TEMPLATES } from '@ohana/shared';
import { BackLink } from '../components/BackLink';
import { spaceColor } from '../lib/color';
import { useContacts, useMaintenances, useSpace } from '../lib/data';
import type { Maintenance } from '../lib/types';
import { DoneSheet } from './maintenances/DoneSheet';
import { MaintenanceForm, type FormState } from './maintenances/MaintenanceForm';
import { MaintenanceRow } from './maintenances/MaintenanceRow';
import { sortByDue, useOpenFromQuery } from './maintenances/listing';

type SheetState = FormState | { mode: 'done'; m: Maintenance } | null;

/** Manutenzioni (3f): ultima volta e prossima scadenza, nient'altro. Diventano scadenze ricorrenti con il professionista collegato. */
export default function MaintenancesPage() {
  const { selected, spaces, spaceById, canWrite, defaultSpace } = useSpace();
  const { data: list = [] } = useMaintenances();
  const { data: contacts = [] } = useContacts();
  const [params, setParams] = useSearchParams();
  const [sheet, setSheet] = useState<SheetState>(null);
  const now = useMemo(() => new Date(), []);
  const writable = canWrite(selected === 'all' ? defaultSpace?.id : selected);

  useOpenFromQuery(params, setParams, setSheet);

  const rows = sortByDue(list, selected);
  const usedTemplates = new Set(rows.map((r) => r.m.template_key));
  const currentSpace = selected !== 'all' ? spaceById(selected) : undefined;

  return (
    <>
      <BackLink to="/altro" label="Altro" />
      {currentSpace && (
        <div
          className="muted"
          style={{ fontSize: 13, display: 'flex', gap: 6, alignItems: 'center', paddingTop: 8 }}
        >
          <span className="dot" style={{ background: spaceColor(currentSpace.color_hue) }} />
          {currentSpace.name}
        </div>
      )}
      <h2 className="page-title" style={{ fontSize: 36 }}>
        Manutenzioni
      </h2>
      <p className="muted" style={{ fontSize: 14, marginTop: 6 }}>
        Diventano scadenze ricorrenti, con il professionista collegato
      </p>

      <div className="list">
        {rows.map(({ m, due }) => (
          <MaintenanceRow
            key={m.id}
            maintenance={m}
            due={due}
            now={now}
            contactName={contacts.find((c) => c.id === m.contact_id)?.name}
            spaceHue={spaceById(m.space_id)?.color_hue}
            showSpace={selected === 'all'}
            onOpen={() => setSheet({ mode: 'edit', m })}
          />
        ))}
        {rows.length === 0 && (
          <div className="empty">Nessuna manutenzione. Parti da un modello qui sotto.</div>
        )}
      </div>

      {writable && (
        <>
          <div className="label section-label">Aggiungi da modello</div>
          <div className="pill-row">
            {MAINTENANCE_TEMPLATES.filter((t) => t.key === 'custom' || !usedTemplates.has(t.key)).map((t) => (
              <button
                key={t.key}
                className="pill"
                onClick={() => setSheet({ mode: 'new', template: t, text: '' })}
              >
                + {t.short}
              </button>
            ))}
          </div>
        </>
      )}
      {!writable && spaces.length > 0 && (
        <p className="muted" style={{ marginTop: 16 }}>
          Hai accesso in sola lettura.
        </p>
      )}

      {sheet?.mode === 'done' && <DoneSheet maintenance={sheet.m} onClose={() => setSheet(null)} />}
      {sheet && sheet.mode !== 'done' && (
        <MaintenanceForm
          state={sheet}
          onClose={() => setSheet(null)}
          onDone={(m) => setSheet({ mode: 'done', m })}
        />
      )}
    </>
  );
}
