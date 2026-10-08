import type { Db } from '../src/db';

type Row = Record<string, unknown>;
type Filter = (row: Row) => boolean;

/** Confronta due istanti ISO per valore (le stringhe «…:00Z» e «…:00.000Z» non si ordinano come testo). */
const compare = (a: unknown, b: string): number => new Date(String(a)).getTime() - new Date(b).getTime();

/**
 * Database finto in memoria con la parte di API di supabase-js che usano i job del Worker
 * (select/insert/update/delete/upsert, filtri eq/in/is/lt/lte/gte/neq, order, limit, range, maybeSingle).
 * Le relazioni incorporate (`spaces(name)`, `event_reminders(...)`) vanno già dentro le righe di test.
 */
export class FakeDb {
  tables: Record<string, Row[]> = {};
  constructor(seed: Record<string, Row[]> = {}) {
    for (const [name, rows] of Object.entries(seed)) {
      this.tables[name] = rows.map((r) => ({ ...r }));
    }
  }
  rows(table: string): Row[] {
    return (this.tables[table] ??= []);
  }
  from(table: string) {
    return new Query(this, table);
  }
  asDb(): Db {
    return this as unknown as Db;
  }
}

class Query implements PromiseLike<{ data: unknown; error: { message: string } | null }> {
  private action: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  private payload: Row | Row[] = {};
  private filters: Filter[] = [];
  private sortBy: string | null = null;
  private max = Infinity;
  private window: [number, number] | null = null;
  private returning = false;
  private single = false;
  private upsertOptions: { onConflict?: string; ignoreDuplicates?: boolean } = {};
  constructor(
    private db: FakeDb,
    private table: string,
  ) {}

  select(): this {
    if (this.action === 'select') {
      this.returning = true;
    } else {
      this.returning = true;
    }
    return this;
  }
  insert(payload: Row | Row[]): this {
    this.action = 'insert';
    this.payload = payload;
    return this;
  }
  upsert(payload: Row | Row[], options: { onConflict?: string; ignoreDuplicates?: boolean } = {}): this {
    this.action = 'upsert';
    this.payload = payload;
    this.upsertOptions = options;
    return this;
  }
  update(payload: Row): this {
    this.action = 'update';
    this.payload = payload;
    return this;
  }
  delete(): this {
    this.action = 'delete';
    return this;
  }

  eq(col: string, value: unknown): this {
    return this.where((r) => r[col] === value);
  }
  neq(col: string, value: unknown): this {
    return this.where((r) => r[col] !== value);
  }
  in(col: string, values: unknown[]): this {
    return this.where((r) => values.includes(r[col]));
  }
  is(col: string, value: null): this {
    return this.where((r) => (r[col] ?? null) === value);
  }
  lt(col: string, value: number): this {
    return this.where((r) => (r[col] as number) < value);
  }
  lte(col: string, value: string): this {
    return this.where((r) => compare(r[col], value) <= 0);
  }
  gte(col: string, value: string): this {
    return this.where((r) => compare(r[col], value) >= 0);
  }
  match(values: Row): this {
    return this.where((r) => Object.entries(values).every(([k, v]) => r[k] === v));
  }
  or(): this {
    return this;
  } // filtro per finestra temporale: nei test le righe sono già quelle volute
  order(col: string): this {
    this.sortBy = col;
    return this;
  }
  limit(n: number): this {
    this.max = n;
    return this;
  }
  range(from: number, to: number): this {
    this.window = [from, to];
    return this;
  }
  maybeSingle(): this {
    this.single = true;
    return this;
  }
  private where(f: Filter): this {
    this.filters.push(f);
    return this;
  }

  private run(): { data: unknown; error: { message: string } | null } {
    const rows = this.db.rows(this.table);
    const matching = rows.filter((r) => this.filters.every((f) => f(r)));
    switch (this.action) {
      case 'insert': {
        const incoming = [this.payload].flat();
        const key =
          this.table === 'brief_log'
            ? ['user_id', 'day']
            : this.table === 'digest_log'
              ? ['user_id', 'day', 'kind']
              : null;
        if (key && incoming.some((n) => rows.some((r) => key.every((k) => r[k] === n[k])))) {
          return { data: null, error: { message: 'duplicate key' } };
        }
        rows.push(...incoming.map((r) => ({ ...r })));
        return { data: null, error: null };
      }
      case 'upsert': {
        const keys = (this.upsertOptions.onConflict ?? 'id').split(',');
        for (const n of [this.payload].flat()) {
          const existing = rows.find((r) =>
            keys.every((k) =>
              k === 'occurrence_at'
                ? new Date(r[k] as string).getTime() === new Date(n[k] as string).getTime()
                : r[k] === n[k],
            ),
          );
          if (!existing) {
            rows.push({ ...n });
          } else if (!this.upsertOptions.ignoreDuplicates) {
            Object.assign(existing, n);
          }
        }
        return { data: null, error: null };
      }
      case 'update':
        matching.forEach((r) => Object.assign(r, this.payload));
        return { data: this.returning ? matching.map((r) => ({ id: r.id })) : null, error: null };
      case 'delete':
        this.db.tables[this.table] = rows.filter((r) => !matching.includes(r));
        return { data: null, error: null };
      default: {
        let out = [...matching];
        if (this.sortBy) {
          out.sort((a, b) => String(a[this.sortBy!]).localeCompare(String(b[this.sortBy!])));
        }
        if (this.window) {
          out = out.slice(this.window[0], this.window[1] + 1);
        }
        out = out.slice(0, this.max);
        return { data: this.single ? (out[0] ?? null) : out, error: null };
      }
    }
  }

  then<R1 = { data: unknown; error: { message: string } | null }, R2 = never>(
    onfulfilled?:
      ((value: { data: unknown; error: { message: string } | null }) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return Promise.resolve(this.run()).then(onfulfilled, onrejected);
  }
}
