import { doseSummary, dosesOfDay, formatSlot, type DoseMed, type TakenDose } from './doses';

export interface TodayRow {
  title: string;
  sub: string;
}

interface RecipientLike {
  label: string | null;
  first_name: string;
  caregiver_ids: string[];
}

/** Come la famiglia chiama la persona: «Papà», altrimenti il nome. */
export const careName = (r: Pick<RecipientLike, 'label' | 'first_name'>): string =>
  r.label?.trim() || r.first_name;

/**
 * La riga di cura in Oggi (4g): una per persona, solo per i suoi caregiver e solo se c'è ancora qualcosa da fare —
 * terapie di oggi non ancora date, oppure parametri monitorati non ancora registrati oggi quando non ci sono terapie.
 */
export function careTodayRow(input: {
  recipient: RecipientLike;
  meds: DoseMed[];
  taken: TakenDose[];
  trackedParamLabels: string[];
  measuredToday: boolean;
  userId: string;
  now: Date;
}): TodayRow | null {
  const { recipient, meds, taken, trackedParamLabels, measuredToday, userId, now } = input;
  if (!recipient.caregiver_ids.includes(userId)) {
    return null;
  }
  const name = careName(recipient);
  const items = dosesOfDay(meds, taken, now);
  const { taken: done, total, next } = doseSummary(items, now);
  if (total > 0 && done < total && next) {
    return {
      title: `${name} · terapie ${done} di ${total}`,
      sub: `Prossima: ${next.med.name.toLowerCase()} alle ${formatSlot(next.slot)}`,
    };
  }
  if (total === 0 && trackedParamLabels.length > 0 && !measuredToday) {
    return { title: `${name} · parametri da registrare`, sub: trackedParamLabels.join(', ') };
  }
  return null;
}
