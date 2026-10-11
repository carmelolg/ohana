import { describe, expect, it } from 'vitest';
import { collectDeadlines, groupByMonth } from './deadlines';
import type { DocumentRow, Occurrence, Procedure } from './types';

const from = new Date('2026-10-01T00:00:00Z');
const all = () => true;

const occ = (id: string, slug: string, status: string, iso: string): Occurrence =>
  ({
    key: id,
    at: new Date(iso),
    event: { id, title: 'Bolletta luce', status, space_id: 's1', categories: { slug } },
  }) as unknown as Occurrence;

describe('collectDeadlines', () => {
  const src = {
    occurrences: [
      occ('e1', 'scadenza', 'open', '2026-11-05T09:00:00Z'),
      occ('e2', 'scadenza', 'done', '2026-10-20T09:00:00Z'),
      occ('e3', 'visita', 'open', '2026-10-21T09:00:00Z'),
    ],
    documents: [{ id: 'd1', space_id: 's1', title: 'Passaporto', expires_at: '2026-10-15' }] as DocumentRow[],
    maintenances: [
      {
        id: 'm1',
        space_id: 's1',
        title: 'Caldaia',
        events: [{ starts_at: '2026-12-01T09:00:00Z', status: 'open' }],
      },
    ],
    procedures: [
      { id: 'p1', space_id: 's1', title: 'ISEE', due_date: '2026-09-01', status: 'in_corso' },
    ] as Procedure[],
  } as unknown as Parameters<typeof collectDeadlines>[0];

  it('prende solo scadenze aperte, documenti e manutenzioni future, in ordine di data', () => {
    const list = collectDeadlines(src, all, from);
    expect(list.map((d) => d.id)).toEqual(['doc-d1', 'e1', 'man-m1']);
  });
  it('esclude gli spazi fuori vista e le date passate', () => {
    expect(collectDeadlines(src, () => false, from)).toEqual([]);
  });
  it('raggruppa per mese', () => {
    const groups = groupByMonth(collectDeadlines(src, all, from));
    expect(groups.map(([m]) => m)).toEqual(['ottobre 2026', 'novembre 2026', 'dicembre 2026']);
  });
});
