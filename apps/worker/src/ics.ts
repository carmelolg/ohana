export interface IcsEvent {
  kind?: 'appuntamento' | 'faccenda';
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  location: string | null;
  notes: string | null;
  rrule: string | null;
  status: 'open' | 'done';
  space_name: string;
  event_reminders: { offset_minutes: number }[];
}

const esc = (s: string) =>
  s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const utc = (iso: string) =>
  new Date(iso)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');

/** Piega le righe a 75 ottetti come da RFC 5545 §3.1. */
export function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) {
    return line;
  }
  const out: string[] = [];
  let cur = '';
  let curLen = 0;
  let limit = 75;
  for (const ch of line) {
    const l = new TextEncoder().encode(ch).length;
    if (curLen + l > limit) {
      out.push(cur);
      cur = ch;
      curLen = l;
      limit = 74; // la riga di continuazione inizia con uno spazio
    } else {
      cur += ch;
      curLen += l;
    }
  }
  out.push(cur);
  return out.join('\r\n ');
}

export function buildIcs(events: IcsEvent[], calName: string, now = new Date()): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ohana//IT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(calName)}`,
    'X-WR-TIMEZONE:Europe/Rome',
  ];
  for (const e of events) {
    const start = new Date(e.starts_at);
    const end = e.ends_at ? new Date(e.ends_at) : new Date(start.getTime() + 3600000);
    lines.push('BEGIN:VEVENT', `UID:${e.id}@ohana`, `DTSTAMP:${utc(now.toISOString())}`);
    if (e.all_day) {
      const d = (x: Date) => x.toISOString().slice(0, 10).replace(/-/g, '');
      lines.push(`DTSTART;VALUE=DATE:${d(start)}`);
    } else {
      lines.push(`DTSTART:${utc(start.toISOString())}`, `DTEND:${utc(end.toISOString())}`);
    }
    lines.push(`SUMMARY:${esc(e.title)}`);
    if (e.location) {
      lines.push(`LOCATION:${esc(e.location)}`);
    }
    const desc = [e.space_name, e.notes].filter(Boolean).join(' · ');
    if (desc) {
      lines.push(`DESCRIPTION:${esc(desc)}`);
    }
    if (e.rrule) {
      lines.push(`RRULE:${e.rrule.replace(/^RRULE:/, '')}`);
    }
    if (e.status === 'done') {
      lines.push('STATUS:CANCELLED');
    }
    for (const r of e.event_reminders) {
      lines.push(
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:${esc(e.title)}`,
        `TRIGGER:-PT${r.offset_minutes}M`,
        'END:VALARM',
      );
    }
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
