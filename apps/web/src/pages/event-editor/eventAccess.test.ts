import { describe, expect, it } from 'vitest';
import { canEditEvent } from './eventAccess';

const base = { existing: null, isNew: false, canWriteSpace: true, hasDefaultSpace: true };

describe('canEditEvent', () => {
  it('impegno dello spazio in cui si può scrivere', () => {
    expect(canEditEvent({ ...base, existing: { import_id: null } })).toBe(true);
  });
  it('sola lettura', () => {
    expect(canEditEvent({ ...base, existing: { import_id: null }, canWriteSpace: false })).toBe(false);
  });
  it('nuovo impegno con uno spazio predefinito', () => {
    expect(canEditEvent({ ...base, isNew: true, canWriteSpace: false })).toBe(true);
    expect(canEditEvent({ ...base, isNew: true, canWriteSpace: false, hasDefaultSpace: false })).toBe(false);
  });
  it('un impegno importato non si modifica, nemmeno da chi può scrivere', () => {
    expect(canEditEvent({ ...base, existing: { import_id: 'imp1' } })).toBe(false);
  });
});
