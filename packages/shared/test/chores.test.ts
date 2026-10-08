import { describe, expect, it } from 'vitest';
import {
  choresForToday,
  doneActionPatch,
  nextMaintenanceDate,
  daysUntil,
  rinviataLabel,
  romeParts,
  romeToDate,
} from '../src';

const TODAY = romeToDate(2026, 10, 8, 10, 0); // giovedì
const chore = (over: Record<string, unknown> = {}) => ({
  id: 'c',
  assignee_id: 'u',
  rrule: 'FREQ=WEEKLY;BYDAY=TH',
  starts_at: romeToDate(2026, 10, 8).toISOString(),
  last_done_at: null as string | null,
  ...over,
});

describe('faccende in Oggi: rinvio automatico', () => {
  it('scadenza oggi → due', () => {
    const r = choresForToday([chore()], TODAY);
    expect(r.items.map((i) => i.state)).toEqual(['due']);
    expect(r).toMatchObject({ done: 0, total: 1 });
  });
  it('non fatta ieri → oggi come «rinviata», non «scaduta»', () => {
    const r = choresForToday([chore({ starts_at: romeToDate(2026, 10, 7).toISOString() })], TODAY);
    expect(r.items[0]).toMatchObject({ state: 'rinviata', daysLate: 1 });
    expect(rinviataLabel(1)).toBe('ieri, rinviata');
  });
  it('non fatta da 3 giorni: una sola riga, ancora «rinviata»', () => {
    const r = choresForToday([chore({ starts_at: romeToDate(2026, 10, 5).toISOString() })], TODAY);
    expect(r.items).toHaveLength(1);
    expect(r.items[0]).toMatchObject({ state: 'rinviata', daysLate: 3 });
    expect(rinviataLabel(3)).toBe('rinviata da 3 gg');
  });
  it('fatta oggi → barrata e conteggiata; scadenza futura → assente', () => {
    const fatta = chore({
      starts_at: romeToDate(2026, 10, 15).toISOString(),
      last_done_at: romeToDate(2026, 10, 8, 9, 0).toISOString(),
    });
    const futura = chore({ id: 'f', starts_at: romeToDate(2026, 10, 9).toISOString() });
    const r = choresForToday([fatta, futura, chore({ id: 'x' })], TODAY);
    expect(r.items.map((i) => i.state)).toEqual(['due', 'done']);
    expect(r).toMatchObject({ done: 1, total: 2 });
  });
  it('fatta ieri, scadenza oggi → è di nuovo da fare', () => {
    const r = choresForToday([chore({ last_done_at: romeToDate(2026, 10, 7, 20, 0).toISOString() })], TODAY);
    expect(r.items[0].state).toBe('due');
  });
  it('ordine: rinviate, di oggi, fatte', () => {
    const r = choresForToday(
      [
        chore({
          id: 'd',
          last_done_at: romeToDate(2026, 10, 8, 8).toISOString(),
          starts_at: romeToDate(2026, 10, 15).toISOString(),
        }),
        chore({ id: 'o' }),
        chore({ id: 'r', starts_at: romeToDate(2026, 10, 6).toISOString() }),
      ],
      TODAY,
    );
    expect(r.items.map((i) => i.chore.id)).toEqual(['r', 'o', 'd']);
  });
  it('«fatto» sposta alla prossima occorrenza e ricorda quando', () => {
    const p = doneActionPatch(
      {
        starts_at: romeToDate(2026, 10, 6).toISOString(),
        ends_at: null,
        rrule: 'FREQ=WEEKLY;BYDAY=TH',
        status: 'open',
      },
      TODAY,
    );
    expect(romeParts(new Date(p.starts_at!))).toMatchObject({ m: 10, d: 15 }); // giovedì successivo, non oggi: oggi conta come fatta
    expect(p.last_done_at).toBe(TODAY.toISOString());
    // poi in Oggi risulta barrata
    const r = choresForToday([chore({ starts_at: p.starts_at!, last_done_at: p.last_done_at! })], TODAY);
    expect(r.items[0].state).toBe('done');
  });
});

describe('manutenzioni: prossima scadenza', () => {
  const NOW = romeToDate(2026, 10, 8, 10, 0);
  it("annuale dopo l'ultima volta", () => {
    const n = nextMaintenanceDate('FREQ=YEARLY', romeToDate(2025, 11, 4), NOW);
    expect(romeParts(n)).toMatchObject({ y: 2026, m: 11, d: 4, h: 9 });
  });
  it('«ogni anno a novembre» senza ultima volta → 1 novembre', () => {
    expect(romeParts(nextMaintenanceDate('FREQ=YEARLY;BYMONTH=11', null, NOW))).toMatchObject({
      y: 2026,
      m: 11,
      d: 1,
    });
  });
  it("fatta a novembre → novembre dell'anno dopo", () => {
    expect(
      romeParts(nextMaintenanceDate('FREQ=YEARLY;BYMONTH=11', romeToDate(2026, 11, 4), NOW)),
    ).toMatchObject({ y: 2027, m: 11, d: 1 });
  });
  it("gomme: due volte l'anno (aprile e novembre)", () => {
    expect(
      romeParts(nextMaintenanceDate('FREQ=YEARLY;BYMONTH=4,11', romeToDate(2026, 4, 15), NOW)),
    ).toMatchObject({ y: 2026, m: 11, d: 1 });
    expect(
      romeParts(nextMaintenanceDate('FREQ=YEARLY;BYMONTH=4,11', romeToDate(2026, 11, 15), NOW)),
    ).toMatchObject({ y: 2027, m: 4, d: 1 });
  });
  it('ogni 6 mesi e ogni 2 anni', () => {
    expect(
      romeParts(nextMaintenanceDate('FREQ=MONTHLY;INTERVAL=6', romeToDate(2026, 5, 20), NOW)),
    ).toMatchObject({ y: 2026, m: 11, d: 20 });
    expect(
      romeParts(nextMaintenanceDate('FREQ=YEARLY;INTERVAL=2', romeToDate(2025, 9, 10), NOW)),
    ).toMatchObject({ y: 2027, m: 9, d: 10 });
  });
  it('attraversa il cambio ora senza spostare le 9:00', () => {
    expect(
      romeParts(nextMaintenanceDate('FREQ=MONTHLY;INTERVAL=6', romeToDate(2026, 4, 20), NOW)),
    ).toMatchObject({ m: 10, d: 20, h: 9 });
    expect(
      romeParts(nextMaintenanceDate('FREQ=MONTHLY;INTERVAL=1', romeToDate(2026, 10, 20), NOW)),
    ).toMatchObject({ m: 11, d: 20, h: 9 });
  });
  it('giorni mancanti', () => {
    expect(daysUntil(romeToDate(2026, 11, 4, 9), NOW)).toBe(27);
    expect(daysUntil(romeToDate(2026, 10, 1, 9), NOW)).toBe(-7);
  });
});
