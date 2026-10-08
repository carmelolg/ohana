import { describe, expect, it } from 'vitest';
import { expenseProblem, sharesFor } from './splits';

describe('divisione di una spesa', () => {
  it('parti uguali: i centesimi non si perdono', () => {
    const shares = sharesFor('uguali', 10, ['a', 'b', 'c'], {});
    expect(shares.map((s) => s.amount).reduce((x, y) => x + y, 0)).toBeCloseTo(10, 2);
  });
  it('personalizzata: legge gli importi scritti, vuoto = 0', () => {
    expect(sharesFor('personalizzate', 10, ['a', 'b'], { a: '7,50' })).toEqual([
      { userId: 'a', amount: 7.5 },
      { userId: 'b', amount: 0 },
    ]);
  });
  it('segnala dati mancanti e quote che non tornano', () => {
    expect(expenseProblem('', 10, ['a'], [{ userId: 'a', amount: 10 }])).toMatch(/descrizione e importo/);
    expect(expenseProblem('Ticket', 0, ['a'], [])).toMatch(/descrizione e importo/);
    expect(expenseProblem('Ticket', 10, [], [])).toMatch(/almeno una persona/);
    expect(expenseProblem('Ticket', 10, ['a'], [{ userId: 'a', amount: 7 }])).toMatch(/sommano/);
    expect(expenseProblem('Ticket', 10, ['a'], [{ userId: 'a', amount: 10 }])).toBeNull();
  });
});
