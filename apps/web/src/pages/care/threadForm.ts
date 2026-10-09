import { SPACE_HUES } from '@ohana/shared';
import type { ThreadToSave } from '../../lib/api/care';
import type { CareThread } from '../../lib/types';

export interface ThreadForm {
  title: string;
  specialty: string;
  doctor: string;
  contactId: string;
  colorHue: number;
  startedAt: string;
  trackedParams: string[];
}

/** Il primo colore non ancora usato dagli altri filoni della persona (così sono distinguibili); poi si ricomincia. */
export function nextHue(used: number[]): number {
  return SPACE_HUES.find((h) => !used.includes(h)) ?? SPACE_HUES[used.length % SPACE_HUES.length];
}

export function initialThreadForm(existing: CareThread | null, usedHues: number[]): ThreadForm {
  return existing
    ? {
        title: existing.title,
        specialty: existing.specialty ?? '',
        doctor: existing.doctor ?? '',
        contactId: existing.contact_id ?? '',
        colorHue: existing.color_hue,
        startedAt: existing.started_at ?? '',
        trackedParams: existing.tracked_params,
      }
    : {
        title: '',
        specialty: '',
        doctor: '',
        contactId: '',
        colorHue: nextHue(usedHues),
        startedAt: '',
        trackedParams: [],
      };
}

export const threadFormError = (f: ThreadForm): string | null =>
  f.title.trim() ? null : 'Dai un nome al filone (es. «Tachicardia»)';

export function buildThread(
  f: ThreadForm,
  ids: { id: string; spaceId: string; recipientId: string },
): ThreadToSave {
  return {
    ...ids,
    title: f.title,
    specialty: f.specialty,
    doctor: f.doctor,
    contactId: f.contactId || null,
    colorHue: f.colorHue,
    startedAt: f.startedAt || null,
    trackedParams: f.trackedParams,
  };
}
