import type { Mutate } from '../../lib/data';
import { newId } from '../../lib/outbox';
import type { Contact } from '../../lib/types';

/** Contatto in modifica: tutti i campi sono facoltativi finché non si salva. */
export type ContactDraft = Partial<Contact>;

const clean = (value: string | null | undefined): string | null => value?.trim() || null;

/** Riga pronta per il database: testi ripuliti, coordinate solo se c'è un indirizzo. */
export function contactRow(draft: ContactDraft, spaceId: string) {
  const address = clean(draft.address);
  return {
    id: draft.id ?? newId(),
    space_id: spaceId,
    name: draft.name!.trim(),
    role: clean(draft.role),
    phone: clean(draft.phone),
    email: clean(draft.email),
    address,
    address_lat: address ? (draft.address_lat ?? null) : null,
    address_lng: address ? (draft.address_lng ?? null) : null,
    notes: clean(draft.notes),
  };
}

export async function saveContact(mutate: Mutate, draft: ContactDraft, spaceId: string): Promise<void> {
  await mutate({ table: 'contacts', action: 'upsert', payload: contactRow(draft, spaceId) });
}

export async function deleteContact(mutate: Mutate, id: string): Promise<void> {
  await mutate({ table: 'contacts', action: 'delete', match: { id } });
}
