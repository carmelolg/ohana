import { useMemo } from 'react';
import { parseQuick, type ParsedEvent } from '@ohana/shared';
import { fullName } from '../../lib/color';
import type { Category, Contact, Space } from '../../lib/types';

interface Args {
  text: string;
  /** Il parser serve solo per le nuove voci; in modifica il testo è il titolo. */
  enabled: boolean;
  /** Spazio scelto a mano: ha la precedenza su `#spazio` nel testo. */
  spaceOverride: string | undefined;
  defaultSpaceId: string | undefined;
  spaces: Space[];
  contacts: Contact[];
  categories: Category[];
}

/**
 * Interpreta il testo libero in due passaggi: il primo individua lo spazio (`#spazio`),
 * il secondo riconosce la categoria tra quelle di quello spazio.
 */
export function useQuickParse({
  text,
  enabled,
  spaceOverride,
  defaultSpaceId,
  spaces,
  contacts,
  categories,
}: Args): ParsedEvent | null {
  const context = useMemo(() => {
    const members = new Map<string, { name: string; aliases: string[] }>();
    for (const s of spaces) {
      for (const m of s.space_members) {
        members.set(m.user_id, { name: fullName(m.profiles), aliases: [m.profiles.first_name] });
      }
    }
    return {
      spaces: spaces.map((s) => ({ id: s.id, name: s.name })),
      members: [...members].map(([id, v]) => ({ id, ...v })),
      contacts: contacts.map((c) => ({ id: c.id, name: c.name })),
    };
  }, [spaces, contacts]);

  return useMemo(() => {
    if (!enabled) {
      return null;
    }
    const now = new Date();
    const first = parseQuick(text, now, context);
    const spaceId = spaceOverride ?? first.spaceId ?? defaultSpaceId;
    const ofSpace = categories
      .filter((c) => c.space_id === spaceId)
      .map((c) => ({ id: c.id, slug: c.slug, name: c.name, keywords: c.keywords }));
    return parseQuick(text, now, { ...context, categories: ofSpace });
  }, [text, context, enabled, spaceOverride, defaultSpaceId, categories]);
}
