import { describe, expect, it } from 'vitest';
import { parseQuick, romeParts, romeToDate } from '../src';

// mercoledì 7 ottobre 2026, 10:00 a Roma
const NOW = romeToDate(2026, 10, 7, 10, 0);
const ctx = {
  spaces: [
    { id: 's1', name: 'Casa mia' },
    { id: 's2', name: 'Mamma e papà' },
  ],
  members: [
    { id: 'u1', name: 'Giulia Rossi' },
    { id: 'u3', name: 'Zio Pino', aliases: ['Giuseppe'] },
    { id: 'u2', name: 'Marco Bianchi' },
  ],
  contacts: [{ id: 'c1', name: 'Dott. Verdi' }],
};
const at = (d: Date | null) => (d ? romeParts(d) : null);

describe('categorie personalizzate', () => {
  const cats = [
    { id: 'k-visita', slug: 'visita', name: 'Visita', keywords: [] },
    { id: 'k-altro', slug: 'altro', name: 'Altro', keywords: [] },
    { id: 'k-animali', slug: null, name: 'Animali', keywords: ['veterinario', 'cane', 'gatto'] },
    { id: 'k-sport', slug: null, name: 'Sport', keywords: ['palestra', 'c++'] },
  ];
  it('riconosce per parola chiave e ha la precedenza sulle predefinite', () => {
    const r = parseQuick('Visita dal veterinario per il cane domani', NOW, { categories: cats });
    expect(r.categoryId).toBe('k-animali');
    expect(r.category).toBe('Animali');
  });
  it('riconosce per nome della categoria', () => {
    expect(parseQuick('Sport sabato alle 10', NOW, { categories: cats }).categoryId).toBe('k-sport');
  });
  it('predefinita -> id dalla lista; nessuna -> Altro', () => {
    expect(parseQuick('Cardiologo domani', NOW, { categories: cats }).categoryId).toBe('k-visita');
    expect(parseQuick('Pranzo con zia', NOW, { categories: cats }).categoryId).toBe('k-altro');
  });
  it('parole chiave con caratteri speciali non rompono la regex e niente falsi positivi parziali', () => {
    expect(() => parseQuick('corso c++ domani', NOW, { categories: cats })).not.toThrow();
    expect(parseQuick('Il gattopardo a teatro', NOW, { categories: cats }).categoryId).not.toBe('k-animali');
  });
});

describe('parseQuick', () => {
  it('domani alle 15 con spazio e assegnatario', () => {
    const r = parseQuick('Cardiologo domani alle 15 #mamma @giulia', NOW, ctx);
    expect(r.title).toBe('Cardiologo');
    expect(at(r.startsAt)).toMatchObject({ y: 2026, m: 10, d: 8, h: 15, min: 0 });
    expect(r.spaceId).toBe('s2');
    expect(r.assigneeId).toBe('u1');
    expect(r.category).toBe('visita');
    expect(r.hasTime).toBe(true);
  });

  it('@menzione per soprannome o per nome reale', () => {
    expect(parseQuick('Caldaia @pino', NOW, ctx).assigneeId).toBe('u3');
    expect(parseQuick('Caldaia @giuseppe', NOW, ctx).assigneeId).toBe('u3');
  });

  it('data assoluta con mese', () => {
    const r = parseQuick('Revisione auto il 12 novembre alle 9:30', NOW);
    expect(at(r.startsAt)).toMatchObject({ m: 11, d: 12, h: 9, min: 30 });
    expect(r.category).toBe('scadenza');
    expect(r.title).toBe('Revisione auto');
  });

  it("data passata passa all'anno successivo", () => {
    const r = parseQuick('Compleanno 3 marzo', NOW);
    expect(at(r.startsAt)).toMatchObject({ y: 2027, m: 3, d: 3 });
  });

  it('tra N giorni', () => {
    const r = parseQuick('Telefonare al comune tra 3 giorni', NOW);
    expect(at(r.startsAt)).toMatchObject({ m: 10, d: 10 });
    expect(r.category).toBe('burocrazia');
  });

  it('giorno della settimana: oggi = mercoledì -> prossimo lunedì', () => {
    const r = parseQuick('Idraulico lunedì alle 8', NOW);
    expect(at(r.startsAt)).toMatchObject({ m: 10, d: 12, h: 8 });
    expect(r.category).toBe('professionista');
  });

  it('ricorrenza mensile e promemoria', () => {
    const r = parseQuick('Bolletta luce ogni mese il 20 ricordamelo 2 giorni prima', NOW);
    expect(r.rrule).toBe('FREQ=MONTHLY');
    expect(r.reminderMinutes).toBe(2880);
    expect(at(r.startsAt)).toMatchObject({ m: 10, d: 20 });
    expect(r.title).toBe('Bolletta luce');
  });

  it('ogni lunedì imposta BYDAY', () => {
    const r = parseQuick('Terapia ogni lunedì alle 8', NOW);
    expect(r.rrule).toBe('FREQ=WEEKLY;BYDAY=MO');
    expect(at(r.startsAt)).toMatchObject({ d: 12, h: 8 });
  });

  it('sera converte in 24h', () => {
    const r = parseQuick('Cena dopodomani alle 8 di sera', NOW);
    expect(at(r.startsAt)).toMatchObject({ d: 9, h: 20 });
  });

  it('solo orario già passato -> domani', () => {
    const r = parseQuick('Chiamare alle 9', NOW);
    expect(at(r.startsAt)).toMatchObject({ d: 8, h: 9 });
  });

  it('riconosce contatto in rubrica', () => {
    const r = parseQuick('Visita Dott. Verdi venerdì', NOW, ctx);
    expect(r.contactId).toBe('c1');
  });

  it('senza data restituisce startsAt nullo', () => {
    const r = parseQuick('Comprare regalo', NOW);
    expect(r.startsAt).toBeNull();
    expect(r.title).toBe('Comprare regalo');
  });

  it("gestisce l'ora legale (cambio 25 ottobre 2026)", () => {
    const r = parseQuick('Visita 26 ottobre alle 10', NOW);
    expect(r.startsAt!.toISOString()).toBe('2026-10-26T09:00:00.000Z'); // CET = UTC+1
    const s = parseQuick('Visita 20 ottobre alle 10', NOW);
    expect(s.startsAt!.toISOString()).toBe('2026-10-20T08:00:00.000Z'); // CEST = UTC+2
  });
});
