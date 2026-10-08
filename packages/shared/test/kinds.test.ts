import { describe, expect, it } from 'vitest';
import { parseQuick, romeParts, romeToDate } from '../src';

const NOW = romeToDate(2026, 10, 8, 10, 0); // giovedì 8 ottobre 2026
const ctx = {
  members: [
    { id: 'f', name: 'Francesca Neri' },
    { id: 'l', name: 'Luca Rossi' },
  ],
};

describe('tipo riconosciuto dal testo libero', () => {
  it('«caldaia ogni anno a novembre» → manutenzione annuale a novembre', () => {
    const r = parseQuick('caldaia ogni anno a novembre', NOW);
    expect(r.kind).toBe('manutenzione');
    expect(r.templateKey).toBe('caldaia');
    expect(r.rrule).toBe('FREQ=YEARLY;BYMONTH=11');
    expect(r.title).toBe('Revisione caldaia');
    expect(romeParts(r.startsAt!)).toMatchObject({ y: 2026, m: 11, d: 1 });
  });
  it('«plastica ogni giovedì @Francesca» → faccenda assegnata, solo giorno', () => {
    const r = parseQuick('plastica ogni giovedì @Francesca', NOW, ctx);
    expect(r.kind).toBe('faccenda');
    expect(r.assigneeId).toBe('f');
    expect(r.rrule).toBe('FREQ=WEEKLY;BYDAY=TH');
    expect(r.title).toBe('Plastica');
    expect(r.hasTime).toBe(false);
    expect(romeParts(r.startsAt!)).toMatchObject({ d: 8, h: 0, min: 0 }); // oggi è giovedì: «ogni giovedì» parte da oggi
  });
  it('faccenda anche con sola parola chiave (senza assegnatario)', () => {
    expect(parseQuick('annaffiare le piante ogni 3 giorni', NOW).kind).toBe('faccenda');
  });
  it('un impegno ricorrente normale resta un impegno', () => {
    expect(parseQuick('Bolletta luce ogni mese il 20', NOW).kind).toBe('appuntamento');
    expect(parseQuick('Terapia ogni lunedì alle 8', NOW, ctx).kind).toBe('appuntamento');
    expect(parseQuick('plastica ogni giovedì alle 20', NOW).kind).toBe('appuntamento'); // con orario non è una faccenda
  });
  it('manutenzioni con altri modelli', () => {
    expect(parseQuick('gomme invernali ogni anno', NOW).templateKey).toBe('gomme');
    expect(parseQuick('estintore ogni 6 mesi', NOW).templateKey).toBe('estintore');
    expect(parseQuick('pulizia filtri condizionatore ogni anno a maggio', NOW).rrule).toBe(
      'FREQ=YEARLY;BYMONTH=5',
    );
    expect(parseQuick('caldaia domani alle 10', NOW).kind).toBe('appuntamento'); // senza ricorrenza è una visita del tecnico
  });
  it('pratiche', () => {
    const r = parseQuick('ISEE mamma', NOW);
    expect(r.kind).toBe('pratica');
    expect(r.templateKey).toBe('isee');
    expect(r.title).toBe('ISEE mamma');
    expect(parseQuick("rinnovo carta d'identità", NOW).templateKey).toBe('carta_identita');
    expect(parseQuick('pratica invalidità papà', NOW).templateKey).toBe('invalidita');
    expect(parseQuick("scadenza carta d'identità 12 dicembre", NOW).kind).toBe('appuntamento');
    expect(parseQuick('pratica assicurazione', NOW).templateKey).toBe('custom');
  });
  it('nota e scansione', () => {
    const n = parseQuick('nota: le chiavi di casa le ho io fino a domenica', NOW);
    expect(n.kind).toBe('nota');
    expect(n.noteText).toBe('le chiavi di casa le ho io fino a domenica');
    expect(parseQuick('bacheca - ricordate il pane', NOW).noteText).toBe('ricordate il pane');
    expect(parseQuick('scansiona bolletta', NOW).kind).toBe('scansione');
  });
  it('«ogni novembre» e «ogni anno in ottobre»', () => {
    expect(parseQuick('revisione auto ogni novembre', NOW).rrule).toBe('FREQ=YEARLY;BYMONTH=11');
    expect(parseQuick('grondaie ogni anno in ottobre', NOW).rrule).toBe('FREQ=YEARLY;BYMONTH=10');
  });
});

import { parseNoteExpiry } from '../src';
describe('scadenza nota in bacheca', () => {
  it('«fino a domenica» → fine di domenica', () => {
    const d = parseNoteExpiry('le chiavi le ho io fino a domenica.', NOW)!;
    expect(romeParts(d)).toMatchObject({ m: 10, d: 11, h: 23, min: 59 });
  });
  it('«fino al 12 novembre» e «fino a domani»', () => {
    expect(romeParts(parseNoteExpiry('parcheggio libero fino al 12 novembre', NOW)!)).toMatchObject({
      m: 11,
      d: 12,
    });
    expect(romeParts(parseNoteExpiry('fino a domani niente pane', NOW)!)).toMatchObject({ d: 9 });
  });
  it('senza «fino a» → nessuna scadenza', () => {
    expect(parseNoteExpiry('ricordate il pane', NOW)).toBeNull();
  });
});

describe('mesi abbreviati', () => {
  it('«entro 31 dic» e «il 15 gen.»', () => {
    expect(romeParts(parseQuick('Holter entro 31 dic', NOW).startsAt!)).toMatchObject({
      y: 2026,
      m: 12,
      d: 31,
    });
    expect(romeParts(parseQuick('controllo il 15 gen. alle 10', NOW).startsAt!)).toMatchObject({
      y: 2027,
      m: 1,
      d: 15,
      h: 10,
    });
    expect(romeParts(parseQuick('prenotare 3 mar', NOW).startsAt!)).toMatchObject({ y: 2027, m: 3, d: 3 });
  });
  it('non confonde il giorno della settimana', () => {
    expect(parseQuick('riunione martedì alle 9', NOW).startsAt).not.toBeNull();
  });
});

describe('ricorrenza settimanale nello stesso giorno', () => {
  it('«ogni giovedì alle 8» detto giovedì alle 10 → settimana prossima; «alle 18» → oggi', () => {
    expect(romeParts(parseQuick('Terapia ogni giovedì alle 8', NOW).startsAt!)).toMatchObject({
      d: 15,
      h: 8,
    });
    expect(romeParts(parseQuick('Terapia ogni giovedì alle 18', NOW).startsAt!)).toMatchObject({
      d: 8,
      h: 18,
    });
  });
});
