import type { Contact } from '../../lib/types';

/** Contatti dello spazio scelto ("all" = tutti), per ruolo e per nome (senza badare alle maiuscole). */
export function filterContacts(
  contacts: Contact[],
  selected: string,
  role: string,
  query: string,
): { scoped: Contact[]; roles: string[]; shown: Contact[] } {
  const scoped = contacts.filter((c) => selected === 'all' || c.space_id === selected);
  const roles = [...new Set(scoped.map((c) => c.role).filter((r): r is string => !!r))];
  const needle = query.toLowerCase();
  const shown = scoped.filter(
    (c) => (!role || c.role === role) && (!query || c.name.toLowerCase().includes(needle)),
  );
  return { scoped, roles, shown };
}
