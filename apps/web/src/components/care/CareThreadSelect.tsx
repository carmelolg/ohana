import { useEffect } from 'react';
import { careName } from '@ohana/shared';
import { useCareThreads, useSpaceRecipients } from '../../lib/data';

/**
 * «Cura»: il filone a cui appartiene un impegno (una visita, un esame, una commissione per il medico). Compare solo se lo
 * spazio ha persone assistite con filoni attivi; un impegno collegato entra nel filone, nella preparazione della visita
 * e nelle scadenze di cura.
 */
export function CareThreadSelect({
  spaceId,
  value,
  onChange,
}: {
  spaceId: string;
  value: string;
  onChange: (threadId: string) => void;
}) {
  const people = useSpaceRecipients(spaceId);
  const { data: threads = [] } = useCareThreads();
  const nameOf = (recipientId: string) => careName(people.find((p) => p.id === recipientId)!);
  const options = threads
    .filter((t) => t.status === 'attivo' && people.some((p) => p.id === t.recipient_id))
    .map((t) => ({ id: t.id, label: `${nameOf(t.recipient_id)} · ${t.title}` }))
    .sort((a, b) => a.label.localeCompare(b.label, 'it'));
  // cambiando spazio, un filone di un altro spazio non vale più (a dati caricati: prima non si può dire)
  useEffect(() => {
    if (value && threads.length > 0 && !options.some((t) => t.id === value)) {
      onChange('');
    }
  }, [value, threads.length, options.length]); // eslint-disable-line react-hooks/exhaustive-deps
  if (options.length === 0) {
    return null;
  }
  return (
    <label className="kv">
      <span>Cura</span>
      <select
        className="inline-select"
        aria-label="Cura"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Nessuna</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
