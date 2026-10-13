import { describe, expect, it } from 'vitest';
import { TOUR_STEPS } from './steps';

describe('passi della guida', () => {
  it('hanno id unici e testi compilati', () => {
    expect(new Set(TOUR_STEPS.map((s) => s.id)).size).toBe(TOUR_STEPS.length);
    for (const s of TOUR_STEPS) {
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.text.length).toBeGreaterThan(0);
    }
  });

  it('le pagine dei passi sono rotte dell’app', () => {
    const known = ['/oggi', '/calendario', '/casa', '/famiglia'];
    for (const s of TOUR_STEPS) {
      expect(known).toContain(s.route);
    }
  });

  it('un passo che si supera toccando l’elemento ha un elemento da toccare', () => {
    for (const s of TOUR_STEPS.filter((x) => x.clickAdvances)) {
      expect(s.targets?.length).toBeGreaterThan(0);
    }
  });
});
