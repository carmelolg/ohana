import { useRef } from 'react';
import { Camera, FileText, Image as ImageIcon } from 'lucide-react';
import { ProgressBar } from '../../components/ProgressBar';

/** Primo passo: scattare una foto o scegliere un file. */
export function PickStep({ onPick }: { onPick: (file: File | undefined) => void }) {
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const pdf = useRef<HTMLInputElement>(null);
  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    onPick(e.target.files?.[0]);
    e.target.value = '';
  };
  return (
    <div className="stack" style={{ marginTop: 20 }}>
      <p className="muted">
        Bolletta, referto, ricetta, multa: leggo importo, scadenza e fornitore direttamente sul tuo telefono.
        Il documento non viene inviato a nessun servizio esterno.
      </p>
      <button className="btn accent" onClick={() => camera.current?.click()}>
        <Camera size={20} strokeWidth={1.75} /> Scatta una foto
      </button>
      <button className="btn ghost" onClick={() => gallery.current?.click()}>
        <ImageIcon size={20} strokeWidth={1.75} /> Scegli una foto
      </button>
      <button className="btn ghost" onClick={() => pdf.current?.click()}>
        <FileText size={20} strokeWidth={1.75} /> Scegli un PDF
      </button>
      <input
        ref={camera}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        aria-label="Fotocamera"
        onChange={handle}
      />
      <input
        ref={gallery}
        type="file"
        accept="image/*"
        hidden
        aria-label="Foto dalla galleria"
        onChange={handle}
      />
      {/* campo dedicato: con un accept solo PDF ogni sistema apre il selettore di documenti (con «image/*,application/pdf» alcuni telefoni mostrano solo la galleria) */}
      <input ref={pdf} type="file" accept="application/pdf,.pdf" hidden aria-label="PDF" onChange={handle} />
    </div>
  );
}

/** Secondo passo: lettura in corso. */
export function ReadingStep({ status, progress }: { status: string; progress: number }) {
  return (
    <div className="stack" style={{ marginTop: 20 }} role="status" aria-live="polite">
      <p>{status}…</p>
      <ProgressBar
        value={Math.round(progress * 100)}
        max={100}
        label="Lettura del documento"
        minPercent={5}
        animated
      />
      <p className="muted" style={{ fontSize: 13 }}>
        La prima volta scarico il motore di lettura (circa 6 MB), poi resta sul dispositivo.
      </p>
    </div>
  );
}
