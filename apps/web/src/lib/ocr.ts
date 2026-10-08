// OCR nel browser con Tesseract.js: il motore (worker, core wasm, lingua italiana) viene caricato solo alla prima scansione
// e servito dal nostro dominio (public/ocr): nessun documento lascia il dispositivo.

export interface OcrProgress {
  status: string;
  progress: number;
}

/** Ridimensiona (lato lungo max 2000 px) e converte in scala di grigi con contrasto: migliora molto la lettura da foto. */
export async function prepareImage(file: Blob): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.filter = 'grayscale(1) contrast(1.35)';
  ctx.drawImage(bmp, 0, 0, w, h);
  return new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('Immagine non leggibile'))), 'image/png'),
  );
}

/** Prima pagina di un PDF come immagine (pdf.js caricato solo se serve). */
export async function pdfFirstPage(file: Blob): Promise<Blob> {
  const pdfjs = await import('pdfjs-dist');
  const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const page = await doc.getPage(1);
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: Math.min(3, 2000 / Math.max(base.width, base.height)) });
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;
  void doc.destroy();
  return new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('PDF non leggibile'))), 'image/png'),
  );
}

export async function recognize(image: Blob, onProgress?: (p: OcrProgress) => void): Promise<string> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('ita', 1, {
    workerPath: '/ocr/worker.min.js',
    corePath: '/ocr',
    langPath: '/ocr',
    gzip: true,
    workerBlobURL: false,
    logger: (m: { status: string; progress: number }) =>
      onProgress?.({ status: m.status, progress: m.progress }),
  });
  try {
    const { data } = await worker.recognize(image);
    return data.text;
  } finally {
    await worker.terminate();
  }
}
