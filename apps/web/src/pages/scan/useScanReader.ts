import { useEffect, useState } from 'react';
import { parseDocumentText, type ParsedDocument } from '@ohana/shared';
import { pdfFirstPage, prepareImage, recognize } from '../../lib/ocr';

export type ScanPhase = 'pick' | 'reading' | 'confirm';

const isPdf = (f: File) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name);

/**
 * Dal file scelto al testo letto: prepara l'immagine (o la prima pagina del PDF), esegue l'OCR sul dispositivo
 * e consegna i campi riconosciuti a `onParsed`. Se la lettura fallisce si passa comunque alla conferma, con campi vuoti.
 */
export function useScanReader(onParsed: (doc: ParsedDocument) => void) {
  const [phase, setPhase] = useState<ScanPhase>('pick');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [text, setText] = useState('');

  useEffect(
    () => () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    },
    [preview],
  );

  async function pick(picked: File | undefined) {
    if (!picked) {
      return;
    }
    setError('');
    setFile(picked);
    setPhase('reading');
    setProgress(0);
    setStatus('Preparo l’immagine');
    try {
      const pdf = isPdf(picked);
      const base = pdf ? await pdfFirstPage(picked) : picked;
      const image = await prepareImage(base);
      setPreview(URL.createObjectURL(pdf ? base : picked));
      setStatus('Leggo il testo');
      const recognized = await recognize(image, (p) => {
        if (p.status.includes('recognizing')) {
          setProgress(p.progress);
        }
      });
      setText(recognized);
      onParsed(parseDocumentText(recognized));
    } catch (e) {
      console.error(e);
      setError(
        'Non sono riuscito a leggere il documento: ' +
          (e as Error).message +
          '. Puoi riprovare con una foto più nitida o compilare i campi a mano.',
      );
      setPreview(picked.type.startsWith('image/') ? URL.createObjectURL(picked) : '');
      onParsed(parseDocumentText(''));
    }
    setPhase('confirm');
  }

  /** Torna alla scelta del file (es. «Rifai foto»). */
  function reset() {
    setPhase('pick');
    setFile(null);
    setPreview('');
  }

  return { phase, file, preview, progress, status, error, text, pick, reset };
}
