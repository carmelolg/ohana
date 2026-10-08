import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { spaceColor } from '../lib/color';
import { useMutate, useSpace } from '../lib/data';
import { ContactRow } from './emergency/ContactRow';
import { EditSheet } from './emergency/EditSheet';
import { Header } from './emergency/Header';
import { connectionStatus, knownFacts } from './emergency/status';
import { useEmergencyData } from './emergency/useEmergencyData';

/** Emergenza (3h): 112 sempre per primo, contatti e info chiave. Funziona offline grazie alla copia locale. */
export default function EmergencyPage() {
  const { selected, defaultSpace, canWrite } = useSpace();
  const { infos, spaceList, savedAt, offline, loading } = useEmergencyData();
  const mutate = useMutate();
  const qc = useQueryClient();
  const [pickedSpaceId, setPickedSpaceId] = useState('');
  const [editing, setEditing] = useState(false);

  const activeId =
    pickedSpaceId || (selected !== 'all' ? selected : defaultSpace?.id) || spaceList[0]?.id || '';
  const space = spaceList.find((s) => s.id === activeId);
  const info = infos.find((i) => i.space_id === activeId);
  const writable = canWrite(activeId);
  const facts = knownFacts(info);
  const status = connectionStatus(offline, loading, savedAt);

  async function save(row: Record<string, unknown>) {
    await mutate({ table: 'emergency_info', action: 'upsert', payload: row, onConflict: 'space_id' });
    await qc.invalidateQueries({ queryKey: ['emergency'] });
    setEditing(false);
  }

  return (
    <div style={{ ['--space' as string]: spaceColor(space?.color_hue) }}>
      <Header
        spaces={spaceList}
        activeId={activeId}
        onSpace={setPickedSpaceId}
        status={status}
        editLabel={writable && !offline ? (info ? 'Modifica' : 'Aggiungi dati') : null}
        onEdit={() => setEditing(true)}
      />

      <div className="card" style={{ marginTop: 18, padding: '4px 16px' }}>
        <ContactRow name="112" role="Numero unico emergenze" phone="112" emergency />
        {(info?.contacts ?? []).map((c, i) => (
          <ContactRow key={i} name={c.name} role={c.role} phone={c.phone} />
        ))}
      </div>

      <div className="label" style={{ margin: '18px 8px 8px' }}>
        Da sapere
      </div>
      <div className="card" style={{ padding: '4px 16px' }}>
        {facts.map(([label, value]) => (
          <div key={label} className="kv">
            <span>{label}</span>
            <span style={{ whiteSpace: 'pre-wrap' }}>{value}</span>
          </div>
        ))}
        {facts.length === 0 && (
          <p className="muted" style={{ padding: '10px 0', fontSize: 14 }}>
            {writable
              ? 'Nessun dato: aggiungi indirizzo, citofono, allergie e i numeri utili.'
              : 'Nessun dato inserito per questo spazio.'}
          </p>
        )}
      </div>

      {editing && (
        <EditSheet info={info} spaceId={activeId} onClose={() => setEditing(false)} onSave={save} />
      )}
    </div>
  );
}
