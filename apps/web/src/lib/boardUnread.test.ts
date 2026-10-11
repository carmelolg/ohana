import { describe, expect, it } from 'vitest';
import { noteActive, readAtBySpace, unreadNotes } from './boardUnread';
import type { BoardNote } from './types';

const note = (id: string, over: Partial<BoardNote> = {}): BoardNote => ({
  id,
  space_id: 's1',
  author_id: 'altro',
  text: id,
  pinned: true,
  expires_at: null,
  notify_push: false,
  notified_at: null,
  created_at: '2026-10-10T10:00:00Z',
  ...over,
});
const NOW = new Date('2026-10-11T10:00:00Z');

describe('unreadNotes', () => {
  const readAt = readAtBySpace([{ space_id: 's1', read_at: '2026-10-10T09:00:00Z' }]);
  it('conta le note altrui più recenti dell’ultima apertura', () => {
    const notes = [note('nuova'), note('vecchia', { created_at: '2026-10-09T10:00:00Z' })];
    expect(unreadNotes(notes, readAt, 'io', NOW).map((n) => n.id)).toEqual(['nuova']);
  });
  it('non conta le proprie note né quelle scadute', () => {
    const notes = [note('mia', { author_id: 'io' }), note('scaduta', { expires_at: '2026-10-11T09:00:00Z' })];
    expect(unreadNotes(notes, readAt, 'io', NOW)).toEqual([]);
  });
  it('senza apertura registrata per lo spazio, le sue note altrui sono tutte nuove', () => {
    const old = note('vecchia', { space_id: 's2', created_at: '2020-01-01T00:00:00Z' });
    expect(unreadNotes([old], readAt, 'io', NOW).map((n) => n.id)).toEqual(['vecchia']);
  });
  it('noteActive: scade all’istante indicato', () => {
    expect(noteActive(note('x', { expires_at: '2026-10-11T10:00:00Z' }), NOW)).toBe(false);
    expect(noteActive(note('x'), NOW)).toBe(true);
  });
});
