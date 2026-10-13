import { describe, expect, it, vi } from 'vitest';
import type { CareReminderEvent } from './data';
import { careRows, maintenanceRows, procedureRows, sortTimeline } from './timeline';
import type { CareEntry, MaintenanceLog, ProcedureStep } from './types';

const entry = (over: Partial<CareEntry>): CareEntry =>
  ({
    id: 'c1',
    type: 'nota',
    entry_date: '2026-03-10',
    title: 'Nota',
    text: null,
    readings: {},
    follow_ups: [],
    author_id: 'u1',
    event_id: null,
    care_files: [],
    ...over,
  }) as unknown as CareEntry;
const event = (id: string, starts_at: string): CareReminderEvent =>
  ({
    id,
    title: `Impegno ${id}`,
    starts_at,
    status: 'open',
    attachments: [],
  }) as unknown as CareReminderEvent;
const ctx = { authorName: (id: string) => `Utente ${id}`, openFile: vi.fn(), openAttachment: vi.fn() };

describe('careRows', () => {
  it('in cima gli impegni, dal più lontano al più vicino; poi i tasselli dal più recente', () => {
    const rows = careRows(
      [entry({ id: 'a', entry_date: '2026-01-05' }), entry({ id: 'b', entry_date: '2026-03-10' })],
      [event('e1', '2026-12-01T08:00:00Z'), event('e2', '2026-10-01T08:00:00Z')],
      ctx,
    );
    expect(rows.map((r) => r.id)).toEqual(['e1', 'e2', 'b', 'a']);
    expect(rows.map((r) => r.planned)).toEqual([true, true, false, false]);
  });

  it('un impegno che ha già il suo tassello non si ripete', () => {
    const rows = careRows(
      [entry({ id: 'v', type: 'visita', event_id: 'e1' })],
      [event('e1', '2026-03-10T08:00:00Z')],
      ctx,
    );
    expect(rows.map((r) => r.id)).toEqual(['v']);
  });

  it('visita: pallino pieno, autore nell’etichetta; nota: niente autore', () => {
    const [visit, note] = careRows(
      [entry({ id: 'v', type: 'visita', entry_date: '2026-04-01' }), entry({ id: 'n' })],
      [],
      ctx,
    );
    expect(visit).toMatchObject({ filled: true, type: 'Visita · Utente u1' });
    expect(note).toMatchObject({ filled: false, type: 'Nota' });
  });

  it('valori del referto e prossimi passi compaiono come righe leggibili', () => {
    const [row] = careRows(
      [
        entry({
          readings: { crp_mgdl: 23 },
          follow_ups: [
            { title: 'Prossimo controllo', due_date: '2027-01-13', due_hint: null, event_id: null },
          ],
        } as never),
      ],
      [],
      ctx,
    );
    expect(row.facts).toEqual(['PCR: 23 mg/dl', 'Prossimo controllo · 13 gen 2027']);
  });

  it('i file diventano chip che aprono il percorso giusto', () => {
    const [row] = careRows(
      [entry({ care_files: [{ id: 'f', name: 'Referto', path: 's/r/f.pdf' }] as never })],
      [],
      ctx,
    );
    row.chips[0].onOpen();
    expect(row.chips[0].label).toBe('📎 Referto');
    expect(ctx.openFile).toHaveBeenCalledWith('s/r/f.pdf');
  });

  it('un impegno del filone segnato fatto compare tra i fatti, senza il tassello della visita', () => {
    const done = {
      ...event('e2', '2026-10-22T08:50:00Z'),
      status: 'done',
      attachments: [],
    } as unknown as CareReminderEvent;
    const [row] = careRows([], [done], ctx);
    expect(row.planned).toBe(false);
    expect(row.type).toBe('Impegno svolto');
  });

  it("gli allegati dell'impegno in programma sono chip apribili dal bucket degli allegati", () => {
    const planned = {
      ...event('e1', '2026-10-22T09:00:00Z'),
      attachments: [{ id: 'a1', path: 's/e1/esame.pdf', name: 'esame.pdf', created_at: '2026-10-01' }],
    } as unknown as CareReminderEvent;
    const [row] = careRows([], [planned], ctx);
    expect(row.chips.map((c) => c.label)).toEqual(['📎 esame.pdf']);
    row.chips[0].onOpen();
    expect(ctx.openAttachment).toHaveBeenCalledWith('s/e1/esame.pdf');
  });
});

const log = (over: Partial<MaintenanceLog>): MaintenanceLog => ({
  id: 'l1',
  space_id: 's',
  maintenance_id: 'm1',
  done_on: '2025-11-05',
  cost: null,
  contact_id: null,
  note: null,
  created_by: null,
  ...over,
});
const caldaia = {
  id: 'm1',
  title: 'Revisione caldaia',
  events: [
    { id: 'e1', starts_at: '2026-11-05T08:00:00Z', status: 'open' as const },
    { id: 'e0', starts_at: '2025-11-05T08:00:00Z', status: 'done' as const },
  ],
};

describe('maintenanceRows', () => {
  it('la scadenza aperta è in cima; gli interventi eseguiti seguono dal più recente', () => {
    const rows = maintenanceRows(
      caldaia,
      [log({ id: 'a', done_on: '2024-11-02' }), log({ id: 'b' })],
      () => undefined,
    );
    expect(rows.map((r) => r.id)).toEqual(['e1', 'b', 'a']);
    expect(rows[0]).toMatchObject({ planned: true, href: '/evento/e1' });
  });

  it('le scadenze già chiuse non compaiono: la storia viene dal registro', () => {
    const rows = maintenanceRows(caldaia, [], () => undefined);
    expect(rows.map((r) => r.id)).toEqual(['e1']);
  });

  it('riassume professionista, costo e nota', () => {
    const [row] = maintenanceRows(
      { ...caldaia, events: [] },
      [log({ cost: 120, contact_id: 'c1', note: 'cambio guarnizione' })],
      (id) => (id === 'c1' ? 'Rossi' : undefined),
    );
    // l'euro è separato da uno spazio non divisibile (Intl)
    expect(row.text).toBe('Rossi · 120\u00a0€ · cambio guarnizione');
  });

  it('senza dettagli non c’è testo', () => {
    const [row] = maintenanceRows({ ...caldaia, events: [] }, [log({})], () => undefined);
    expect(row.text).toBeUndefined();
    expect(row).toMatchObject({ planned: false, filled: true, type: 'Eseguita' });
  });

  it('la data dell’intervento è il giorno a Roma, non quello del dispositivo', () => {
    const [row] = maintenanceRows(
      { ...caldaia, events: [] },
      [log({ done_on: '2026-01-01' })],
      () => undefined,
    );
    expect(new Date(row.at).toISOString()).toBe('2026-01-01T08:00:00.000Z');
  });
});

const step = (over: Partial<ProcedureStep>): ProcedureStep => ({
  id: 's1',
  procedure_id: 'p',
  position: 0,
  title: 'Passo',
  note: null,
  done_at: null,
  event_id: null,
  amount: null,
  contact_id: null,
  quote_outcome: null,
  ...over,
});

describe('procedureRows', () => {
  it('gli allegati dell’impegno compaiono sulla riga del passaggio e su quella degli impegni collegati', () => {
    const chip = (id: string) => [{ id, label: id, onOpen: () => undefined }];
    const rows = procedureRows(
      [step({ event_id: 'ev' })],
      new Map([['ev', '2026-05-04T07:00:00Z']]),
      [{ id: 'ev2', title: 'Sopralluogo', starts_at: '2026-05-05T07:00:00Z', status: 'open' }],
      { eventChipsOf: (id) => chip('a-' + id) },
    );
    expect(rows.find((r) => r.id === 'ev2')?.chips.map((c) => c.id)).toEqual(['a-ev2']);
    expect(rows.find((r) => r.id !== 'ev2')?.chips.map((c) => c.id)).toEqual(['a-ev']);
  });

  it('i passaggi aperti stanno sopra, nell’ordine inverso dell’iter; il primo da fare tocca l’ultimo fatto', () => {
    const rows = procedureRows(
      [
        step({ id: 'a', position: 0, done_at: '2026-02-01T10:00:00Z' }),
        step({ id: 'b', position: 1, done_at: '2026-02-10T10:00:00Z' }),
        step({ id: 'c', position: 2 }),
        step({ id: 'd', position: 3 }),
      ],
      new Map(),
    );
    expect(rows.map((r) => r.id)).toEqual(['d', 'c', 'b', 'a']);
  });

  it('senza impegno in calendario il passaggio non ha data', () => {
    const [row] = procedureRows([step({})], new Map());
    expect(row).toMatchObject({ planned: true, dated: false, type: 'Da fare', href: undefined });
  });

  it('con impegno collegato mostra data e link', () => {
    const [row] = procedureRows([step({ event_id: 'ev' })], new Map([['ev', '2026-05-04T07:00:00Z']]));
    expect(row).toMatchObject({ planned: true, dated: true, href: '/evento/ev' });
    expect(row.type).toMatch(/^In programma · /);
  });

  it('un passaggio chiuso ha data, pallino pieno e nessun link', () => {
    const [row] = procedureRows([step({ done_at: '2026-02-01T10:00:00Z', event_id: 'ev' })], new Map());
    expect(row).toMatchObject({
      planned: false,
      filled: true,
      dated: true,
      type: 'Completato',
      href: undefined,
    });
  });
});

describe('sortTimeline', () => {
  it('non modifica l’argomento', () => {
    const rows = careRows([entry({ id: 'a' }), entry({ id: 'b', entry_date: '2026-05-01' })], [], ctx);
    const copy = [...rows];
    sortTimeline(rows);
    expect(rows).toEqual(copy);
  });
});

describe('impegni collegati', () => {
  const linkedOpen = {
    id: 'l1',
    title: 'Idraulico',
    starts_at: '2026-12-01T08:00:00Z',
    status: 'open' as const,
  };
  const linkedDone = {
    id: 'l2',
    title: 'Sopralluogo',
    starts_at: '2025-06-01T08:00:00Z',
    status: 'done' as const,
  };

  it('manutenzione: l’impegno aperto è in programma, quello svolto sta tra i fatti', () => {
    const rows = maintenanceRows(
      { ...caldaia, events: [] },
      [log({ id: 'a', done_on: '2025-11-05' })],
      () => undefined,
      [linkedOpen, linkedDone],
    );
    expect(rows.map((r) => r.id)).toEqual(['l1', 'a', 'l2']);
    expect(rows[2]).toMatchObject({ planned: false, type: 'Impegno svolto', href: '/evento/l2' });
  });

  it('pratica: l’impegno di un passaggio non si ripete', () => {
    const rows = procedureRows([step({ id: 's', event_id: 'l1' })], new Map([['l1', linkedOpen.starts_at]]), [
      linkedOpen,
      linkedDone,
    ]);
    expect(rows.map((r) => r.id)).toEqual(['s', 'l2']);
  });

  it('pratica: un impegno collegato in programma sta sopra i passaggi da fare', () => {
    const rows = procedureRows([step({ id: 's', position: 0 })], new Map(), [linkedOpen]);
    expect(rows.map((r) => r.id)).toEqual(['l1', 's']);
  });
});
