// Ogni tabella ascoltata dal client in realtime deve stare nella pubblicazione `supabase_realtime`:
// se ne manca anche una sola, Supabase rifiuta l'intera sottoscrizione e nessun aggiornamento live arriva più (è già successo due volte).
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const src = readFileSync(join(process.cwd(), 'src/lib/data/invalidation.ts'), 'utf8');
const body = /const TABLE_KEYS[^{]*\{([\s\S]*?)\n\};/.exec(src)?.[1] ?? '';
const listened = [...body.matchAll(/^\s+(\w+): \[/gm)].map((m) => m[1]);
const skipped = new Set(
  [...(/NOT_REALTIME = new Set\(\[([^\]]*)\]/.exec(src)?.[1] ?? '').matchAll(/'(\w+)'/g)].map((m) => m[1]),
);

const dir = join(process.cwd(), '../../supabase/migrations');
const published = new Set();
for (const f of readdirSync(dir)
  .filter((x) => x.endsWith('.sql'))
  .sort()) {
  const sql = readFileSync(join(dir, f), 'utf8');
  for (const stmt of sql.split(';')) {
    if (!/alter\s+publication\s+supabase_realtime\s+add\s+table/i.test(stmt)) {
      continue;
    }
    for (const m of stmt.matchAll(/public\.(\w+)/g)) {
      published.add(m[1]);
    }
  }
}
const missing = listened.filter((t) => !skipped.has(t) && !published.has(t));
console.log(
  `Realtime: ${listened.length - skipped.size} tabelle ascoltate, ${published.size} nella pubblicazione`,
);
if (missing.length) {
  console.error('✘ Mancano nella pubblicazione supabase_realtime:', missing.join(', '));
  process.exit(1);
}
console.log('✓ Tutte le tabelle ascoltate sono pubblicate');
