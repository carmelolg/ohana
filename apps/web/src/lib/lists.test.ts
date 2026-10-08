import { describe, expect, it } from 'vitest';
import { moveItem, removeItem, updateItem } from './lists';

describe('lists', () => {
  it('moveItem scambia con il vicino e non esce dai limiti', () => {
    expect(moveItem(['a', 'b', 'c'], 1, -1)).toEqual(['b', 'a', 'c']);
    expect(moveItem(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'c', 'b']);
    const same = ['a', 'b'];
    expect(moveItem(same, 0, -1)).toBe(same);
    expect(moveItem(same, 1, 1)).toBe(same);
  });
  it("non modifica l'elenco originale", () => {
    const original = [{ n: 1 }, { n: 2 }];
    updateItem(original, 0, { n: 9 });
    removeItem(original, 0);
    expect(original).toEqual([{ n: 1 }, { n: 2 }]);
  });
  it("updateItem e removeItem agiscono solo sull'indice indicato", () => {
    expect(
      updateItem(
        [
          { n: 1, t: 'a' },
          { n: 2, t: 'b' },
        ],
        1,
        { t: 'z' },
      ),
    ).toEqual([
      { n: 1, t: 'a' },
      { n: 2, t: 'z' },
    ]);
    expect(removeItem([1, 2, 3], 1)).toEqual([1, 3]);
  });
});
