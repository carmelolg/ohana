import { describe, expect, it } from 'vitest';
import { parseQuick, romeParts, romeToDate } from '@ohana/shared';
import type { EventRow } from '../../lib/types';
import { resolveEventValues } from './eventValues';

const now = romeToDate(2026, 10, 8, 10, 0); // giovedì
const resolve = (partial: Partial<Parameters<typeof resolveEventValues>[0]> = {}) =>
  resolveEventValues({
    overrides: {},
    parsed: null,
    existing: null,
    requestedKind: null,
    defaultSpaceId: 'home',
    userId: 'me',
    now,
    ...partial,
  });

describe('resolveEventValues', () => {
  it('senza nulla: spazio predefinito, nessuna data, nessuna ripetizione', () => {
    expect(resolve()).toMatchObject({
      spaceId: 'home',
      isChore: false,
      startsAt: null,
      contactId: null,
      assigneeId: null,
      rrule: '',
    });
  });

  it('usa ciò che il parser ha capito', () => {
    const parsed = parseQuick('dentista domani alle 15 ogni mese', now, {
      spaces: [{ id: 'home', name: 'Casa' }],
    });
    const v = resolve({ parsed });
    expect(romeParts(v.startsAt!)).toMatchObject({ d: 9, h: 15 });
    expect(v.rrule).toBe('FREQ=MONTHLY');
  });

  it("la scelta dell'utente prevale sul parser, anche se è «nessuno» o «non si ripete»", () => {
    const parsed = parseQuick('dentista domani ogni mese', now, { members: [{ id: 'm1', name: 'Luca' }] });
    const v = resolve({
      parsed: { ...parsed, assigneeId: 'm1' },
      overrides: { assigneeId: null, rrule: '', startsAt: null },
    });
    expect(v).toMatchObject({ assigneeId: null, rrule: '', startsAt: null });
  });

  it('faccenda: solo giorno, assegnata a me di default, ripetizione settimanale sul giorno scelto', () => {
    const v = resolve({
      requestedKind: 'faccenda',
      overrides: { startsAt: romeToDate(2026, 10, 12, 18, 45) },
    }); // lunedì
    expect(v.isChore).toBe(true);
    expect(romeParts(v.startsAt!)).toMatchObject({ d: 12, h: 0, min: 0 });
    expect(v.assigneeId).toBe('me');
    expect(v.rrule).toBe('FREQ=WEEKLY;BYDAY=MO');
    expect(v.ruleOptions.map(([r]) => r)).toContain('FREQ=WEEKLY;INTERVAL=2;BYDAY=MO');
  });

  it("in modifica il tipo è quello salvato, non quello dell'indirizzo", () => {
    const existing = { kind: 'appuntamento' } as EventRow;
    expect(resolve({ existing, requestedKind: 'faccenda' }).isChore).toBe(false);
    expect(resolve({ existing, overrides: { kind: 'faccenda' } }).isChore).toBe(true);
  });
});
