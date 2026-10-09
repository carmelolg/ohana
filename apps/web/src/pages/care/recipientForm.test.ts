import { describe, expect, it } from 'vitest';
import {
  buildRecipient,
  initialRecipientForm,
  linkMember,
  parseAllergies,
  recipientFormError,
} from './recipientForm';

describe('modulo della persona assistita', () => {
  it('parte con te come caregiver', () => {
    expect(initialRecipientForm(null, { spaceId: 's1', me: 'luca' })).toMatchObject({
      spaceId: 's1',
      caregiverIds: ['luca'],
    });
  });

  it('allergie: separatori misti, spazi e doppioni', () => {
    expect(parseAllergies('Penicillina, lattice;  penicillina\nPolline,, ')).toEqual([
      'Penicillina',
      'lattice',
      'penicillina',
      'Polline',
    ]);
    expect(parseAllergies('  ')).toEqual([]);
  });

  it('serve lo spazio, il nome e una descrizione per ogni esenzione', () => {
    const f = initialRecipientForm(null, { spaceId: 's1', me: 'luca' });
    expect(recipientFormError({ ...f, spaceId: '' })).toMatch(/spazio/);
    expect(recipientFormError(f)).toMatch(/nome/);
    expect(
      recipientFormError({ ...f, firstName: 'Giorgio', exemptions: [{ label: ' ', expires_at: null }] }),
    ).toMatch(/esenzione/);
    expect(recipientFormError({ ...f, firstName: 'Giorgio' })).toBeNull();
  });

  it('la scheda da salvare ripulisce i campi', () => {
    const f = {
      ...initialRecipientForm(null, { spaceId: 's1', me: 'luca' }),
      firstName: 'Giorgio',
      taxCode: ' mrtgrg45b14h501x ',
      allergies: 'Penicillina',
      exemptions: [
        { code: ' 009 ', label: ' Morbo di Crohn ', expires_at: '' },
        { label: '', expires_at: null },
      ],
      caregiverIds: ['luca', 'francesca'],
      dutyUserId: 'francesca',
    };
    expect(buildRecipient(f, 'r1')).toMatchObject({
      id: 'r1',
      allergies: ['Penicillina'],
      exemptions: [{ code: '009', label: 'Morbo di Crohn', expires_at: null }],
      dutyUserId: 'francesca',
    });
  });

  it('il caregiver di turno deve essere tra i caregiver', () => {
    const f = {
      ...initialRecipientForm(null, { spaceId: 's1', me: 'luca' }),
      firstName: 'A',
      dutyUserId: 'chiara',
    };
    expect(buildRecipient(f, 'r1').dutyUserId).toBeNull();
  });

  it('collegare un membro precompila il nome solo a modulo vuoto', () => {
    const member = { user_id: 'anna', profiles: { first_name: 'Anna', last_name: 'Rossi' } };
    const empty = initialRecipientForm(null, { spaceId: 's1', me: 'luca' });
    expect(linkMember(empty, member)).toMatchObject({ userId: 'anna', firstName: 'Anna', lastName: 'Rossi' });
    const typed = { ...empty, firstName: 'Annetta' };
    expect(linkMember(typed, member)).toMatchObject({ userId: 'anna', firstName: 'Annetta', lastName: '' });
    expect(linkMember(typed, null).userId).toBe('');
  });

  it('il membro collegato finisce nella scheda da salvare', () => {
    const f = {
      ...initialRecipientForm(null, { spaceId: 's1', me: 'luca' }),
      firstName: 'Anna',
      userId: 'anna',
    };
    expect(buildRecipient(f, 'r1').userId).toBe('anna');
    expect(buildRecipient({ ...f, userId: '' }, 'r1').userId).toBeNull();
  });
});
