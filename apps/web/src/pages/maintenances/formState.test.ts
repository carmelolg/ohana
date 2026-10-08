import { describe, expect, it } from 'vitest';
import { findMaintenanceTemplate, romeToDate } from '@ohana/shared';
import type { Maintenance } from '../../lib/types';
import { computeNext, initialRule, initialTitle, ruleOptions, templateOf, type FormState } from './formState';

const boiler = findMaintenanceTemplate('caldaia')!;
const fresh = (over: Partial<Extract<FormState, { mode: 'new' }>> = {}): FormState => ({
  mode: 'new',
  template: boiler,
  text: '  caldaia ogni anno ',
  ...over,
});

describe('stato del modulo manutenzione', () => {
  it('titolo: modello, altrimenti il testo scritto', () => {
    expect(initialTitle(fresh(), boiler)).toBe(boiler.title);
    const custom = findMaintenanceTemplate('custom')!;
    expect(initialTitle(fresh({ template: custom }), custom)).toBe('caldaia ogni anno');
  });
  it('regola: quella dal testo vince sul modello', () => {
    expect(initialRule(fresh(), boiler)).toBe(boiler.rrule);
    expect(initialRule(fresh({ rrule: 'FREQ=MONTHLY' }), boiler)).toBe('FREQ=MONTHLY');
  });
  it('modifica: titolo, regola e modello vengono dalla manutenzione', () => {
    const m = { title: 'Gomme', rrule: 'FREQ=MONTHLY;INTERVAL=6', template_key: 'gomme' } as Maintenance;
    const state: FormState = { mode: 'edit', m };
    expect(initialTitle(state, templateOf(state))).toBe('Gomme');
    expect(initialRule(state, templateOf(state))).toBe('FREQ=MONTHLY;INTERVAL=6');
  });
  it('opzioni: la regola corrente fuori dai preset compare in coda', () => {
    const options = ruleOptions(boiler, 'FREQ=WEEKLY');
    expect(options.at(-1)?.[0]).toBe('FREQ=WEEKLY');
    expect(options.some(([v]) => v === 'FREQ=YEARLY')).toBe(true);
  });
  it("prossima: dopo l'ultima volta; regola rotta → oggi", () => {
    const now = romeToDate(2026, 10, 8, 10, 0);
    expect(computeNext('FREQ=YEARLY', '2026-03-01', now).getFullYear()).toBe(2027);
    expect(computeNext('FREQ=NOPE', '', now)).toBe(now);
  });
});
