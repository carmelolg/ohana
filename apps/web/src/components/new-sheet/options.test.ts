import { describe, expect, it } from 'vitest';
import { parseQuick, romeToDate } from '@ohana/shared';
import { destinationFor, optionsFor } from './options';

const now = romeToDate(2026, 10, 8, 10, 0);

describe('menu «+»', () => {
  it('cinque voci; «Manutenzione» solo quando il testo la riconosce', () => {
    expect(optionsFor(null).map((o) => o.title)).toEqual([
      'Impegno',
      'Faccenda ricorrente',
      'Scansiona documento',
      'Pratica',
      'Nota in bacheca',
    ]);
    expect(
      optionsFor('manutenzione')
        .map((o) => o.title)
        .slice(0, 2),
    ).toEqual(['Impegno', 'Manutenzione']);
    expect(optionsFor('faccenda')).toHaveLength(5);
  });

  it('impegno: con testo lo precompila, senza testo apre il modulo vuoto', () => {
    expect(destinationFor('appuntamento', '  Cardiologo domani ', null)).toEqual({
      type: 'route',
      to: '/nuovo?text=Cardiologo+domani',
    });
    expect(destinationFor('appuntamento', '', null)).toEqual({ type: 'route', to: '/nuovo' });
  });

  it('faccenda e scansione', () => {
    expect(destinationFor('faccenda', 'plastica ogni giovedì', null)).toEqual({
      type: 'route',
      to: '/nuovo?tipo=faccenda&text=plastica+ogni+gioved%C3%AC',
    });
    expect(destinationFor('scansione', 'qualsiasi', null)).toEqual({ type: 'route', to: '/scansiona' });
  });

  it('manutenzione: modello e ricorrenza capiti dal testo', () => {
    const text = 'caldaia ogni anno a novembre';
    const to = destinationFor('manutenzione', text, parseQuick(text, now));
    expect(to).toMatchObject({ type: 'route' });
    const params = new URLSearchParams((to as { to: string }).to.split('?')[1]);
    expect(params.get('nuova')).toBe('caldaia');
    expect(params.get('rrule')).toBe('FREQ=YEARLY;BYMONTH=11');
  });

  it("pratica: modello dal testo, titolo scritto dall'utente; senza modello «custom»", () => {
    const parsed = parseQuick('ISEE mamma', now);
    expect(destinationFor('pratica', 'ISEE mamma', parsed)).toEqual({
      type: 'route',
      to: '/pratiche?nuova=isee&text=ISEE+mamma',
    });
    expect(destinationFor('pratica', 'qualcosa', null)).toEqual({
      type: 'route',
      to: '/pratiche?nuova=custom&text=qualcosa',
    });
  });

  it('nota: il testo senza prefisso «nota:»', () => {
    const text = 'nota: le chiavi le ho io';
    expect(destinationFor('nota', text, parseQuick(text, now))).toEqual({
      type: 'note',
      text: 'le chiavi le ho io',
    });
    expect(destinationFor('nota', 'solo testo', null)).toEqual({ type: 'note', text: 'solo testo' });
  });

  it('le voci di una funzione spenta non compaiono', () => {
    const off = (f: string) => f !== 'pratiche' && f !== 'documenti';
    expect(optionsFor(null, off).map((o) => o.kind)).toEqual(['appuntamento', 'faccenda', 'nota']);
    expect(optionsFor('manutenzione', (f) => f !== 'manutenzioni').map((o) => o.kind)).not.toContain(
      'manutenzione',
    );
  });
});
