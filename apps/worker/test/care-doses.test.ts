import { beforeEach, describe, expect, it, vi } from 'vitest';
import { romeToDate } from '@ohana/shared';
import { dueDoses, dutyCaregiver, groupReminders, type DoseMed, type DoseRecipient } from '../src/care-doses';
import type { Env } from '../src/env';
import { FakeDb } from './fake-db';

let current: FakeDb;
const pushes: { userId: string; title: string; body: string }[] = [];
let delivered = 1;
vi.mock('../src/db', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/db')>()),
  createDb: () => current.asDb(),
}));
vi.mock('../src/notify', () => ({
  pushToUser: async (_env: unknown, _db: unknown, userId: string, msg: { title: string; body: string }) => {
    pushes.push({ userId, title: msg.title, body: msg.body });
    return delivered;
  },
}));
const { sendDoseReminders } = await import('../src/jobs/care-doses');

const med = (over: Partial<DoseMed> = {}): DoseMed => ({
  id: 'biso',
  recipient_id: 'papa',
  name: 'Bisoprololo',
  strength: '2,5 mg',
  dose_units: 1,
  unit: 'cpr',
  schedule: ['08:00'],
  active: true,
  ...over,
});
const papa: DoseRecipient = {
  id: 'papa',
  label: 'Papà',
  first_name: 'Giorgio',
  caregiver_ids: ['luca', 'francesca'],
  duty_user_id: null,
};
const at = (h: number, min: number) => romeToDate(2026, 10, 28, h, min);

describe('dosi da ricordare', () => {
  it("scatta all'orario della dose, con una tolleranza se il cron è in ritardo", () => {
    expect(dueDoses([med()], [], at(7, 59))).toEqual([]);
    expect(dueDoses([med()], [], at(8, 0))).toHaveLength(1);
    expect(dueDoses([med()], [], at(8, 14))).toHaveLength(1);
    expect(dueDoses([med()], [], at(8, 16))).toEqual([]); // dose saltata, non si insegue
  });

  it('non ricorda una dose già segnata né una terapia sospesa o senza orari', () => {
    const taken = [{ medication_id: 'biso', day: '2026-10-28', slot: '08:00' }];
    expect(dueDoses([med()], taken, at(8, 5))).toEqual([]);
    expect(dueDoses([med({ active: false })], [], at(8, 5))).toEqual([]);
    expect(dueDoses([med({ schedule: [] })], [], at(8, 5))).toEqual([]);
  });

  it('a cavallo della mezzanotte guarda anche il giorno prima', () => {
    const late = med({ schedule: ['23:55'] });
    const due = dueDoses([late], [], romeToDate(2026, 10, 29, 0, 3));
    expect(due).toEqual([{ medicationId: 'biso', recipientId: 'papa', day: '2026-10-28', slot: '23:55' }]);
  });

  it("di turno c'è il caregiver scelto, altrimenti il primo", () => {
    expect(dutyCaregiver(papa)).toBe('luca');
    expect(dutyCaregiver({ ...papa, duty_user_id: 'francesca' })).toBe('francesca');
    expect(dutyCaregiver({ ...papa, caregiver_ids: [] })).toBeNull();
  });

  it('una notifica per persona e orario, al caregiver di turno', () => {
    const meds = [med(), med({ id: 'mesa', name: 'Mesalazina', strength: '800 mg', dose_units: 2 })];
    const due = dueDoses(meds, [], at(8, 2));
    const reminders = groupReminders(due, meds, [{ ...papa, duty_user_id: 'francesca' }]);
    expect(reminders).toHaveLength(1);
    expect(reminders[0]).toMatchObject({
      userId: 'francesca',
      title: 'Papà · terapie delle 8:00',
      body: 'Bisoprololo 2,5 mg · Mesalazina 800 mg ×2',
      url: '/cura/papa',
    });
  });

  it('senza caregiver non parte niente', () => {
    const due = dueDoses([med()], [], at(8, 2));
    expect(groupReminders(due, [med()], [{ ...papa, caregiver_ids: [] }])).toEqual([]);
  });
});

describe('sendDoseReminders', () => {
  const env = {} as Env;
  const seed = () => ({
    medications: [{ ...med() }],
    care_recipients: [{ ...papa }],
    medication_doses: [],
    care_dose_log: [],
  });
  beforeEach(() => {
    pushes.length = 0;
    delivered = 1;
  });

  it('avvisa il caregiver di turno una sola volta, anche se il cron gira due volte', async () => {
    current = new FakeDb(seed());
    expect(await sendDoseReminders(env, at(8, 1))).toBe(1);
    expect(await sendDoseReminders(env, at(8, 6))).toBe(0);
    expect(pushes).toEqual([
      { userId: 'luca', title: 'Papà · terapie delle 8:00', body: 'Bisoprololo 2,5 mg' },
    ]);
    expect(current.rows('care_dose_log')).toHaveLength(1);
  });

  it("se nessun dispositivo ha ricevuto l'avviso, libera la prenotazione e riprova al giro dopo", async () => {
    current = new FakeDb(seed());
    delivered = 0;
    expect(await sendDoseReminders(env, at(8, 1))).toBe(0);
    expect(current.rows('care_dose_log')).toHaveLength(0);
    delivered = 1;
    expect(await sendDoseReminders(env, at(8, 6))).toBe(1);
  });

  it('non avvisa se la dose è già stata data', async () => {
    current = new FakeDb({
      ...seed(),
      medication_doses: [{ medication_id: 'biso', day: '2026-10-28', slot: '08:00' }],
    });
    expect(await sendDoseReminders(env, at(8, 1))).toBe(0);
    expect(pushes).toHaveLength(0);
  });
});
