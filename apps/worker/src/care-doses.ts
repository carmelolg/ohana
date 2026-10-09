import { formatSlot, isoDayRome, slotInstant, MINUTE_MS, addDaysRome, startOfDayRome } from '@ohana/shared';

/** Quanto dopo l'orario della dose si può ancora avvisare (se il cron è in ritardo); oltre, la dose si considera saltata. */
export const DOSE_GRACE_MS = 15 * MINUTE_MS;

export interface DoseMed {
  id: string;
  recipient_id: string;
  name: string;
  strength: string | null;
  dose_units: number;
  unit: string;
  schedule: string[];
  active: boolean;
}

export interface DoseRecipient {
  id: string;
  label: string | null;
  first_name: string;
  caregiver_ids: string[];
  duty_user_id: string | null;
}

export interface DueDose {
  medicationId: string;
  recipientId: string;
  day: string;
  slot: string;
}

/** Dosi con orario nella finestra (adesso − tolleranza, adesso] che nessuno ha ancora segnato come date. */
export function dueDoses(
  meds: DoseMed[],
  taken: { medication_id: string; day: string; slot: string }[],
  now: Date,
): DueDose[] {
  const done = new Set(taken.map((t) => `${t.medication_id}|${t.day}|${t.slot}`));
  const from = now.getTime() - DOSE_GRACE_MS;
  const days = [addDaysRome(startOfDayRome(now), -1), startOfDayRome(now)].map(isoDayRome);
  return meds
    .filter((m) => m.active)
    .flatMap((m) =>
      days.flatMap((day) =>
        m.schedule
          .filter((slot) => {
            const at = slotInstant(day, slot).getTime();
            return at > from && at <= now.getTime() && !done.has(`${m.id}|${day}|${slot}`);
          })
          .map((slot) => ({ medicationId: m.id, recipientId: m.recipient_id, day, slot })),
      ),
    );
}

/** Il caregiver di turno: quello scelto, altrimenti il primo dell'elenco. */
export const dutyCaregiver = (r: Pick<DoseRecipient, 'duty_user_id' | 'caregiver_ids'>): string | null =>
  r.duty_user_id ?? r.caregiver_ids[0] ?? null;

export interface DoseReminder {
  userId: string;
  recipientId: string;
  day: string;
  slot: string;
  medicationIds: string[];
  title: string;
  body: string;
  url: string;
  tag: string;
}

const MAX_BODY_LENGTH = 160;

/** Una notifica per persona e orario, indirizzata al caregiver di turno; le persone senza caregiver non ricevono nulla. */
export function groupReminders(due: DueDose[], meds: DoseMed[], recipients: DoseRecipient[]): DoseReminder[] {
  const groups = new Map<string, DueDose[]>();
  for (const d of due) {
    const key = `${d.recipientId}|${d.day}|${d.slot}`;
    groups.set(key, [...(groups.get(key) ?? []), d]);
  }
  return [...groups.values()].flatMap((doses) => {
    const recipient = recipients.find((r) => r.id === doses[0].recipientId);
    const userId = recipient ? dutyCaregiver(recipient) : null;
    if (!recipient || !userId) {
      return [];
    }
    const names = doses.map((d) => {
      const m = meds.find((x) => x.id === d.medicationId)!;
      const amount = m.dose_units === 1 ? '' : ` ×${String(m.dose_units).replace('.', ',')}`;
      return `${m.name}${m.strength ? ' ' + m.strength : ''}${amount}`;
    });
    const { day, slot } = doses[0];
    const who = recipient.label?.trim() || recipient.first_name;
    return [
      {
        userId,
        recipientId: recipient.id,
        day,
        slot,
        medicationIds: doses.map((d) => d.medicationId),
        title: `${who} · terapie delle ${formatSlot(slot)}`,
        body: names.join(' · ').slice(0, MAX_BODY_LENGTH),
        url: `/cura/${recipient.id}`,
        tag: `dosi-${recipient.id}-${day}-${slot}`,
      },
    ];
  });
}
