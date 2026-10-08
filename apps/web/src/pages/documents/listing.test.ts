import { describe, expect, it } from 'vitest';
import { romeToDate } from '@ohana/shared';
import type { DocumentRow } from '../../lib/types';
import { docName, expiryBadge, foldersOf } from './listing';

const doc = (over: Partial<DocumentRow>): DocumentRow =>
  ({ id: 'd', folder: 'Altro', title: '', expires_at: null, attachments: null, ...over }) as DocumentRow;
const now = romeToDate(2026, 10, 8, 10, 0);

describe('elenco documenti', () => {
  it('cartelle: prima quelle note in ordine fisso, poi le personalizzate', () => {
    const folders = foldersOf([
      doc({ folder: 'Zio' }),
      doc({ folder: 'Bollette' }),
      doc({ folder: 'Referti' }),
    ]);
    expect(folders).toEqual(['Bollette', 'Referti', 'Zio']);
  });
  it('nome: titolo, nome del file, o «Documento»', () => {
    expect(docName(doc({ title: 'Luce' }))).toBe('Luce');
    expect(docName(doc({ attachments: { name: 'a.pdf' } as DocumentRow['attachments'] }))).toBe('a.pdf');
    expect(docName(doc({}))).toBe('Documento');
  });
  it('scadenza: nessuna, scaduto, vicina, lontana', () => {
    expect(expiryBadge(doc({}), now)).toBeNull();
    expect(expiryBadge(doc({ expires_at: '2026-09-01' }), now)).toEqual({ text: 'SCADUTO', urgent: true });
    expect(expiryBadge(doc({ expires_at: '2026-10-20' }), now)?.urgent).toBe(true);
    const far = expiryBadge(doc({ expires_at: '2027-03-01' }), now);
    expect(far?.urgent).toBe(false);
    expect(far?.text).toMatch(/^ENTRO 1 MAR/);
  });
});
