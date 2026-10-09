import { useRef, useState } from 'react';
import { CARE_PARAMS, EXAM_READING_KEYS, extractReadings, isParamKey, readingInfo } from '@ohana/shared';
import { Field } from '../Field';

interface Props {
  /** Parametri del filone: sempre mostrati. */
  paramKeys: string[];
  values: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}

const labelOf = (key: string) => {
  const info = readingInfo(key);
  return info.unit ? `${info.label} (${info.unit})` : info.label;
};

/** Valori misurati della visita; si possono precompilare leggendo il referto (OCR sul dispositivo). */
export function ReadingsFields({ paramKeys, values, onChange }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState('');
  const keys = [...new Set([...paramKeys.filter(isParamKey), ...Object.keys(values)])];
  const extras = EXAM_READING_KEYS.filter((k) => !keys.includes(k));

  async function readReport(file: File) {
    setStatus('Leggo il referto…');
    try {
      const { prepareImage, pdfFirstPage, recognize } = await import('../../lib/ocr');
      const image = await prepareImage(file.type === 'application/pdf' ? await pdfFirstPage(file) : file);
      const found = extractReadings(await recognize(image));
      onChange({ ...values, ...found });
      setStatus(
        Object.keys(found).length
          ? 'Valori letti dal referto: controllali prima di salvare.'
          : 'Nel referto non ho trovato valori noti.',
      );
    } catch {
      setStatus('Non riesco a leggere il referto. Scrivi i valori a mano.');
    }
  }

  return (
    <div className="stack">
      <div className="hstack" style={{ justifyContent: 'space-between' }}>
        <span className="label">Valori</span>
        <button type="button" className="btn ghost small" onClick={() => input.current?.click()}>
          Leggi dal referto
        </button>
        <input
          ref={input}
          type="file"
          hidden
          accept="image/*,application/pdf"
          onChange={(e) => e.target.files?.[0] && void readReport(e.target.files[0])}
        />
      </div>
      {status && (
        <p className="muted" role="status" style={{ fontSize: 13 }}>
          {status}
        </p>
      )}
      {keys.map((key) => (
        <Field
          key={key}
          label={isParamKey(key) ? `${CARE_PARAMS[key].label} (${CARE_PARAMS[key].unit})` : labelOf(key)}
        >
          <input
            className="input"
            inputMode={key === 'blood_pressure' ? 'text' : 'decimal'}
            placeholder={key === 'blood_pressure' ? '132/80' : ''}
            value={values[key] ?? ''}
            onChange={(e) => onChange({ ...values, [key]: e.target.value })}
          />
        </Field>
      ))}
      <div className="pill-row">
        {extras.map((key) => (
          <button key={key} type="button" className="pill" onClick={() => onChange({ ...values, [key]: '' })}>
            + {readingInfo(key).label}
          </button>
        ))}
      </div>
    </div>
  );
}
