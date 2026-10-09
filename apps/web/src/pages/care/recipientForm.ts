import type { RecipientToSave } from '../../lib/api/care';
import type { CareExemption, CareRecipient } from '../../lib/types';

export interface RecipientForm {
  spaceId: string;
  firstName: string;
  lastName: string;
  label: string;
  birthDate: string;
  taxCode: string;
  /** Allergie scritte separate da virgola o a capo. */
  allergies: string;
  exemptions: CareExemption[];
  caregiverIds: string[];
  dutyUserId: string;
  /** Membro di Ohana collegato; vuoto = persona non iscritta. */
  userId: string;
}

export function initialRecipientForm(
  existing: CareRecipient | null,
  defaults: { spaceId: string; me: string },
): RecipientForm {
  if (!existing) {
    return {
      spaceId: defaults.spaceId,
      firstName: '',
      lastName: '',
      label: '',
      birthDate: '',
      taxCode: '',
      allergies: '',
      exemptions: [],
      caregiverIds: defaults.me ? [defaults.me] : [],
      dutyUserId: '',
      userId: '',
    };
  }
  return {
    spaceId: existing.space_id,
    firstName: existing.first_name,
    lastName: existing.last_name,
    label: existing.label ?? '',
    birthDate: existing.birth_date ?? '',
    taxCode: existing.tax_code ?? '',
    allergies: existing.allergies.join(', '),
    exemptions: existing.exemptions,
    caregiverIds: existing.caregiver_ids,
    dutyUserId: existing.duty_user_id ?? '',
    userId: existing.user_id ?? '',
  };
}

/** «Penicillina, lattice» → ['Penicillina', 'lattice'] (senza voci vuote né doppioni). */
export function parseAllergies(text: string): string[] {
  const items = text
    .split(/[,;\n]/)
    .map((x) => x.trim())
    .filter(Boolean);
  return [...new Set(items)];
}

/** Collega (o scollega, con `null`) un membro: il nome si precompila dal profilo solo se il modulo è ancora vuoto. */
export function linkMember(
  f: RecipientForm,
  member: { user_id: string; profiles: { first_name: string; last_name: string } } | null,
): RecipientForm {
  if (!member) {
    return { ...f, userId: '' };
  }
  const empty = !f.firstName.trim() && !f.lastName.trim();
  return {
    ...f,
    userId: member.user_id,
    firstName: empty ? member.profiles.first_name : f.firstName,
    lastName: empty ? member.profiles.last_name : f.lastName,
  };
}

export function recipientFormError(f: RecipientForm): string | null {
  if (!f.spaceId) {
    return 'Scegli lo spazio della persona';
  }
  if (!f.firstName.trim()) {
    return 'Scrivi il nome';
  }
  if (f.exemptions.some((e) => !e.label.trim())) {
    return 'Ogni esenzione ha bisogno di una descrizione';
  }
  return null;
}

/** Dal modulo alla scheda da salvare: esenzioni senza descrizione scartate, di turno solo se è un caregiver. */
export function buildRecipient(f: RecipientForm, id: string): RecipientToSave {
  return {
    id,
    spaceId: f.spaceId,
    firstName: f.firstName,
    lastName: f.lastName,
    label: f.label,
    birthDate: f.birthDate || null,
    taxCode: f.taxCode,
    allergies: parseAllergies(f.allergies),
    exemptions: f.exemptions
      .filter((e) => e.label.trim())
      .map((e) => ({
        code: e.code?.trim() || undefined,
        label: e.label.trim(),
        expires_at: e.expires_at || null,
      })),
    caregiverIds: f.caregiverIds,
    dutyUserId: f.caregiverIds.includes(f.dutyUserId) ? f.dutyUserId : null,
    userId: f.userId || null,
  };
}
