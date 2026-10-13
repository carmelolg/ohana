import { DAY_MS, MINUTE_MS, expandOccurrences } from '@ohana/shared';

export interface QEvent {
  id: string;
  space_id: string;
  title: string;
  starts_at: string;
  rrule: string | null;
  status: 'open' | 'done';
  assignee_id: string | null;
  kind?: 'appuntamento' | 'faccenda';
  event_reminders: { offset_minutes: number; channels: ('email' | 'push')[] }[];
}
export interface QRecipient {
  id: string;
  notify_email: boolean;
  morning_brief: boolean;
  hasPush: boolean;
}
export interface QueueRow {
  event_id: string;
  occurrence_at: string;
  send_at: string;
  user_id: string;
  channel: 'email' | 'push';
  event_title: string;
}

const HORIZON_DAYS = 60;

type Reminder = QEvent['event_reminders'][number];

/** Le faccende non hanno promemoria né email (solo il riepilogo push delle 8:00); un impegno singolo già fatto non ne ha più. */
const wantsReminders = (ev: QEvent): boolean =>
  ev.kind !== 'faccenda' && (ev.status === 'open' || !!ev.rrule);

/** Destinatari: l'assegnatario se c'è, altrimenti tutti i membri dello spazio. */
function recipientsOf(ev: QEvent, members: QRecipient[]): QRecipient[] {
  return ev.assignee_id ? members.filter((m) => m.id === ev.assignee_id) : members;
}

/**
 * Canali su cui questa persona vuole davvero essere avvisata. Il brief del mattino sostituisce le email dei singoli
 * promemoria (evita una casella piena), ma non le push: sono immediate e il brief non le sostituisce.
 */
function channelsFor(user: QRecipient, reminder: Reminder): Reminder['channels'] {
  return reminder.channels.filter((ch) =>
    ch === 'email' ? user.notify_email && !user.morning_brief : user.hasPush,
  );
}

/** Occorrenze il cui invio cade nella finestra [now - 1 giorno, now + 60 giorni], con il momento di invio. */
function dueOccurrences(ev: QEvent, reminder: Reminder, now: Date): { occurrence: Date; sendAt: Date }[] {
  const offsetMs = reminder.offset_minutes * MINUTE_MS;
  const windowStart = new Date(now.getTime() - DAY_MS);
  const windowEnd = new Date(now.getTime() + HORIZON_DAYS * DAY_MS);
  return expandOccurrences(
    new Date(ev.starts_at),
    ev.rrule,
    new Date(windowStart.getTime() + offsetMs),
    new Date(windowEnd.getTime() + offsetMs),
  )
    .map((occurrence) => ({ occurrence, sendAt: new Date(occurrence.getTime() - offsetMs) }))
    .filter(({ sendAt }) => sendAt >= windowStart);
}

/**
 * Espande promemoria × occorrenze × destinatari × canali per i prossimi 60 giorni.
 * Righe già inviate sono rese idempotenti dal vincolo unique(event_id, occurrence_at, user_id, channel).
 */
export function buildQueueRows(
  events: QEvent[],
  recipientsBySpace: Map<string, QRecipient[]>,
  now: Date,
): QueueRow[] {
  return events.filter(wantsReminders).flatMap((ev) => {
    const targets = recipientsOf(ev, recipientsBySpace.get(ev.space_id) ?? []);
    if (targets.length === 0) {
      return [];
    }
    return ev.event_reminders.flatMap((reminder) =>
      dueOccurrences(ev, reminder, now).flatMap(({ occurrence, sendAt }) =>
        targets.flatMap((user) =>
          channelsFor(user, reminder).map((channel): QueueRow => ({
            event_id: ev.id,
            occurrence_at: occurrence.toISOString(),
            send_at: sendAt.toISOString(),
            user_id: user.id,
            channel,
            event_title: ev.title,
          })),
        ),
      ),
    );
  });
}
