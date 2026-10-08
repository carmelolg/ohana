// Copia i file dell'OCR (Tesseract) in public/ocr così vengono serviti dal nostro dominio:
// nessuna richiesta a CDN esterne e nessun documento lascia il dispositivo. Si scaricano solo alla prima scansione.
import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const out = join(process.cwd(), 'public', 'ocr');
mkdirSync(out, { recursive: true });

const tess = dirname(require.resolve('tesseract.js/package.json'));
const core = dirname(require.resolve('tesseract.js-core/package.json', { paths: [tess] }));
const lang = dirname(require.resolve('@tesseract.js-data/ita/package.json'));

const copies = [
  [join(tess, 'dist', 'worker.min.js'), 'worker.min.js'],
  // varianti LSTM (le uniche usate dal motore predefinito): con e senza SIMD
  [join(core, 'tesseract-core-lstm.wasm.js'), 'tesseract-core-lstm.wasm.js'],
  [join(core, 'tesseract-core-simd-lstm.wasm.js'), 'tesseract-core-simd-lstm.wasm.js'],
  [join(lang, '4.0.0_best_int', 'ita.traineddata.gz'), 'ita.traineddata.gz'],
];
for (const [from, name] of copies) {
  if (!existsSync(from)) {
    throw new Error(`File OCR mancante: ${from}`);
  }
  cpSync(from, join(out, name));
}
const total = readdirSync(out).reduce((t, f) => t + statSync(join(out, f)).size, 0);
console.log(`OCR: ${copies.length} file in public/ocr (${(total / 1048576).toFixed(1)} MB)`);
