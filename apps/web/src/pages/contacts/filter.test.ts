import { describe, expect, it } from 'vitest';
import type { Contact } from '../../lib/types';
import { filterContacts } from './filter';

const c = (id: string, space_id: string, name: string, role: string | null) =>
  ({ id, space_id, name, role }) as Contact;
const all = [
  c('1', 'a', 'Dott. Rossi', 'Medico'),
  c('2', 'a', 'Mario Idraulico', 'Idraulico'),
  c('3', 'b', 'Rossana', null),
];

describe('filtro rubrica', () => {
  it('per spazio e ruoli disponibili', () => {
    const r = filterContacts(all, 'a', '', '');
    expect(r.shown.map((x) => x.id)).toEqual(['1', '2']);
    expect(r.roles).toEqual(['Medico', 'Idraulico']);
    expect(filterContacts(all, 'all', '', '').shown).toHaveLength(3);
  });
  it('per ruolo e nome senza badare alle maiuscole', () => {
    expect(filterContacts(all, 'all', 'Medico', '').shown.map((x) => x.id)).toEqual(['1']);
    expect(filterContacts(all, 'all', '', 'ROSS').shown.map((x) => x.id)).toEqual(['1', '3']);
  });
});
