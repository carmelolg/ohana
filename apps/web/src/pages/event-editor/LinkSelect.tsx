import { useEffect } from 'react';
import { featureOnIn } from '@ohana/shared';
import { useMaintenances, useProcedures, useSpace } from '../../lib/data';
import { linkKey } from './eventLink';

/**
 * «Collega a»: la pratica in corso o la manutenzione di cui questo impegno fa parte. L'impegno entra nella sua linea del
 * tempo. Compare solo se lo spazio ha almeno una pratica aperta o una manutenzione, e se la funzione è accesa.
 */
export function LinkSelect({
  spaceId,
  value,
  onChange,
}: {
  spaceId: string;
  value: string;
  onChange: (key: string) => void;
}) {
  const { spaceById } = useSpace();
  const space = spaceById(spaceId);
  const { data: procedures = [], isLoading: loadingP } = useProcedures();
  const { data: maintenances = [], isLoading: loadingM } = useMaintenances();
  const procedureOptions =
    space && featureOnIn(space, 'pratiche')
      ? procedures.filter(
          (p) =>
            p.space_id === spaceId &&
            (p.status === 'in_corso' || value === linkKey({ kind: 'procedure', id: p.id })),
        )
      : [];
  const maintenanceOptions =
    space && featureOnIn(space, 'manutenzioni') ? maintenances.filter((m) => m.space_id === spaceId) : [];
  const known = [
    ...procedureOptions.map((p) => linkKey({ kind: 'procedure', id: p.id })),
    ...maintenanceOptions.map((m) => linkKey({ kind: 'maintenance', id: m.id })),
  ];
  // cambiando spazio, un collegamento a un oggetto di un altro spazio non vale più (a dati caricati: prima non si può dire)
  useEffect(() => {
    if (value && !loadingP && !loadingM && !known.includes(value)) {
      onChange('');
    }
  }, [value, loadingP, loadingM, known.length]); // eslint-disable-line react-hooks/exhaustive-deps
  if (known.length === 0) {
    return null;
  }
  return (
    <label className="kv">
      <span>Collega a</span>
      <select
        className="inline-select"
        aria-label="Collega a pratica o manutenzione"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Nessuno</option>
        {procedureOptions.length > 0 && (
          <optgroup label="Pratiche">
            {procedureOptions.map((p) => (
              <option key={p.id} value={linkKey({ kind: 'procedure', id: p.id })}>
                {p.title}
              </option>
            ))}
          </optgroup>
        )}
        {maintenanceOptions.length > 0 && (
          <optgroup label="Manutenzioni">
            {maintenanceOptions.map((m) => (
              <option key={m.id} value={linkKey({ kind: 'maintenance', id: m.id })}>
                {m.title}
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </label>
  );
}
