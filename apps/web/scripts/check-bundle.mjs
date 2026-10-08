// Budget del bundle iniziale: dopo le nuove funzioni (v2) non può crescere di più di 30 KB gzip rispetto alla v1.
// «Iniziale» = tutto il JavaScript richiesto da index.html (script + modulepreload); Tesseract, pdf.js, Leaflet e le pagine di Altro sono lazy.
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const dist = join(process.cwd(), 'dist');
const budget = JSON.parse(readFileSync(join(process.cwd(), 'bundle-budget.json'), 'utf8'));
const html = readFileSync(join(dist, 'index.html'), 'utf8');
const files = [...html.matchAll(/(?:src|href)="\/(assets\/[^"]+\.js)"/g)].map((m) => m[1]);
let total = 0;
for (const f of new Set(files)) {
  const size = gzipSync(readFileSync(join(dist, f))).length;
  total += size;
  console.log(`  ${f.padEnd(40)} ${(size / 1024).toFixed(1)} KB gzip`);
}
const limit = budget.v1InitialGzipBytes + budget.maxGrowthBytes;
const kb = (n) => (n / 1024).toFixed(1);
console.log(
  `Iniziale: ${kb(total)} KB gzip · v1: ${kb(budget.v1InitialGzipBytes)} KB · limite: ${kb(limit)} KB (v1 + ${kb(budget.maxGrowthBytes)})`,
);
const lazy = ['tesseract', 'pdf', 'leaflet']
  .map((n) => ({ n, loaded: files.some((f) => f.includes(n)) }))
  .filter((x) => x.loaded);
if (lazy.length) {
  console.error('Caricati nel bundle iniziale ma devono essere lazy:', lazy.map((x) => x.n).join(', '));
  process.exit(1);
}
if (total > limit) {
  console.error(`✘ Bundle iniziale oltre il budget di ${kb(total - limit)} KB`);
  process.exit(1);
}
console.log('✓ Bundle iniziale entro il budget');
