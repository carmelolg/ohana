import { describe, expect, it } from 'vitest';
import { handleFeed } from '../src/http/ics';
import { FakeDb } from './fake-db';

const event = (id: string, space: string, title: string) => ({
  id,
  space_id: space,
  title,
  starts_at: '2099-01-01T08:00:00Z',
  ends_at: null,
  all_day: false,
  location: null,
  notes: null,
  rrule: null,
  status: 'open',
  kind: 'appuntamento',
  import_id: null,
  care_thread_id: null,
  medication_id: null,
  spaces: { name: space === 's1' ? 'Casa' : 'Genitori' },
  event_reminders: [],
});

const seed = (members: Record<string, unknown>[], feeds: Record<string, unknown>[]) =>
  new FakeDb({
    calendar_feeds: feeds,
    space_members: members,
    events: [event('e1', 's1', 'Idraulico'), event('e2', 's2', 'Visita mamma')],
  });
const body = async (db: FakeDb, token: string) => {
  const res = await handleFeed(db.asDb(), token);
  return { status: res.status, text: await res.text() };
};

describe('feed ICS: chi può leggere cosa', () => {
  const feeds = [
    { token: 'solo-casa', user_id: 'u1', space_id: 's1' },
    { token: 'tutti', user_id: 'u1', space_id: null },
  ];

  it('un membro legge lo spazio del suo link', async () => {
    const db = seed([{ space_id: 's1', user_id: 'u1', role: 'member' }], feeds);
    const r = await body(db, 'solo-casa');
    expect(r.status).toBe(200);
    expect(r.text).toContain('SUMMARY:Idraulico');
    expect(r.text).not.toContain('Visita mamma');
  });

  it('chi è uscito dallo spazio non lo legge più con il vecchio link', async () => {
    const db = seed([{ space_id: 's2', user_id: 'u1', role: 'member' }], feeds);
    const r = await body(db, 'solo-casa');
    expect(r.status).toBe(404);
    expect(r.text).not.toContain('Idraulico');
  });

  it('chi è diventato solo «care_viewer» non vede gli impegni dello spazio', async () => {
    const db = seed([{ space_id: 's1', user_id: 'u1', role: 'care_viewer' }], feeds);
    expect((await body(db, 'solo-casa')).status).toBe(404);
  });

  it('il link «tutti gli spazi» segue gli spazi di cui si è membri adesso', async () => {
    const db = seed(
      [
        { space_id: 's1', user_id: 'u1', role: 'owner' },
        { space_id: 's2', user_id: 'altro', role: 'owner' },
      ],
      feeds,
    );
    const r = await body(db, 'tutti');
    expect(r.text).toContain('Idraulico');
    expect(r.text).not.toContain('Visita mamma');
  });

  it('il link «tutti» di chi non è in nessuno spazio è un calendario vuoto, non un errore', async () => {
    const r = await body(seed([], feeds), 'tutti');
    expect(r.status).toBe(200);
    expect(r.text).not.toContain('BEGIN:VEVENT');
  });

  it('link sconosciuto', async () => {
    expect((await body(seed([], feeds), 'nope')).status).toBe(404);
  });
});
