import { addDaysRome, isoDayRome, startOfDayRome } from '@ohana/shared';
import { dueDoses, groupReminders, type DoseMed, type DoseRecipient } from '../care-doses';
import { claimLog, createDb, fetchAll, releaseLog, type Db } from '../db';
import type { Env } from '../env';
import { pushToUser } from '../notify';

const LOG = 'care_dose_log';

async function loadMeds(db: Db): Promise<DoseMed[]> {
  return fetchAll<DoseMed>((a, b) =>
    db
      .from('medications')
      .select('id, recipient_id, name, strength, dose_units, unit, schedule, active')
      .eq('active', true)
      .order('id')
      .range(a, b),
  );
}

/**
 * Promemoria push delle terapie, all'orario di ogni dose, solo al caregiver di turno (niente email per le singole dosi).
 * Idempotente: prima si prenota la dose nel registro, poi si avvisa; se nessun dispositivo ha ricevuto l'avviso la
 * prenotazione si rilascia, così il prossimo giro del cron può riprovare entro la tolleranza.
 */
export async function sendDoseReminders(env: Env, now = new Date()): Promise<number> {
  const db = createDb(env);
  const meds = await loadMeds(db);
  const withSchedule = meds.filter((m) => m.schedule.length > 0);
  if (withSchedule.length === 0) {
    return 0;
  }
  const since = isoDayRome(addDaysRome(startOfDayRome(now), -1));
  const [{ data: recipients }, { data: taken }] = await Promise.all([
    db.from('care_recipients').select('id, label, first_name, caregiver_ids, duty_user_id'),
    db.from('medication_doses').select('medication_id, day, slot').gte('day', since),
  ]);
  const due = dueDoses(withSchedule, (taken ?? []) as never[], now);
  let sent = 0;
  for (const reminder of groupReminders(due, withSchedule, (recipients ?? []) as DoseRecipient[])) {
    const keys = reminder.medicationIds.map((id) => ({
      medication_id: id,
      day: reminder.day,
      slot: reminder.slot,
    }));
    const claimed: typeof keys = [];
    for (const key of keys) {
      if (await claimLog(db, LOG, key)) {
        claimed.push(key);
      }
    }
    if (claimed.length === 0) {
      continue;
    }
    const delivered = await pushToUser(env, db, reminder.userId, {
      title: reminder.title,
      body: reminder.body,
      url: reminder.url,
      tag: reminder.tag,
      actions: [],
    });
    if (delivered === 0) {
      for (const key of claimed) {
        await releaseLog(db, LOG, key);
      }
    }
    sent += delivered;
  }
  return sent;
}
