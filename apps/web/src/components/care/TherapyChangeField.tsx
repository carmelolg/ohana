import { Field } from '../Field';
import type { Medication } from '../../lib/types';

interface Props {
  meds: Medication[];
  medId: string;
  strength: string;
  doseUnits: string;
  onChange: (patch: { changeMedId?: string; newStrength?: string; newDoseUnits?: string }) => void;
}

/** «Nessuna modifica» oppure il farmaco cambiato dal medico (crea un tassello «terapia»). */
export function TherapyChangeField({ meds, medId, strength, doseUnits, onChange }: Props) {
  const med = meds.find((m) => m.id === medId);
  return (
    <div className="stack">
      <span className="label">Terapia</span>
      <label className="hstack" style={{ minHeight: 44 }}>
        <input
          type="checkbox"
          checked={!medId}
          onChange={(e) =>
            onChange({
              changeMedId: e.target.checked ? '' : (meds[0]?.id ?? ''),
              newStrength: '',
              newDoseUnits: '',
            })
          }
        />
        Nessuna modifica
      </label>
      {medId && (
        <>
          <Field label="Farmaco modificato">
            <select
              className="input"
              value={medId}
              onChange={(e) => onChange({ changeMedId: e.target.value })}
            >
              {meds.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} {m.strength}
                </option>
              ))}
            </select>
          </Field>
          <div className="hstack">
            <Field label={`Nuovo dosaggio (ora ${med?.strength ?? '—'})`} flex>
              <input
                className="input"
                value={strength}
                onChange={(e) => onChange({ newStrength: e.target.value })}
              />
            </Field>
            <Field label={`Quante per volta (ora ${med?.dose_units ?? '—'})`} flex>
              <input
                className="input"
                inputMode="decimal"
                value={doseUnits}
                onChange={(e) => onChange({ newDoseUnits: e.target.value })}
              />
            </Field>
          </div>
        </>
      )}
    </div>
  );
}
