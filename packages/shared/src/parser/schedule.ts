import { addDaysRome, MINUTE_MS, MONTHS_IT, romeParts, romeToDate, WEEKDAYS_IT, DAY_MS } from '../dates';
import { normalizeText } from '../text';
import {
  isSameDay,
  mask,
  minutesOfDay,
  take,
  type Hm,
  type ParseStage,
  type ParseState,
  type Ymd,
} from './state';
import { BYDAY_CODES } from '../recurrence';
import { WEEKDAY_PATTERN, parseCount } from './vocabulary';

const MINUTES_PER_DAY = DAY_MS / MINUTE_MS;
const DEFAULT_HOUR = 9;
const EVENING_HOUR = 20;

const minutesFor = (n: number, unit: string): number => {
  if (unit.startsWith('or')) {
    return n * 60;
  }
  if (unit.startsWith('sett')) {
    return n * 7 * MINUTES_PER_DAY;
  }
  return n * MINUTES_PER_DAY;
};

// ------------------------------------------------------------------ promemoria

/** «ricordamelo 2 giorni prima», «avvisami 3 ore prima», «promemoria il giorno prima». */
export const extractReminder: ParseStage = (st) => {
  const re =
    /\b(?:ricordamelo|ricordami|avvisami|promemoria)\s+(?:(\d+|un|uno|una|due|tre|quattro|cinque)\s+(giorn[oi]|or[ae]|settiman[ae])|il\s+giorno)\s+prima\b/iu;
  const m = re.exec(st.src);
  if (!m) {
    return;
  }
  st.res.reminderMinutes = m[1] ? minutesFor(parseCount(m[1]), m[2].toLowerCase()) : MINUTES_PER_DAY;
  take(st, m, 'reminder');
};

// ------------------------------------------------------------------ ricorrenze

/** «ogni anno a novembre», «ogni novembre», «ogni anno in ottobre»: si ripete il 1° del mese, alle 9. */
export const extractYearlyMonthRecurrence: ParseStage = (st) => {
  const m = new RegExp(
    `\\bogni\\s+(?:anno\\s+(?:a|ad|in|di|nel\\s+mese\\s+di)\\s+)?(${MONTHS_IT.join('|')})\\b`,
    'iu',
  ).exec(st.src);
  if (!m) {
    return;
  }
  const month = MONTHS_IT.indexOf(m[1].toLowerCase() as (typeof MONTHS_IT)[number]) + 1;
  st.res.rrule = `FREQ=YEARLY;BYMONTH=${month}`;
  take(st, m, 'recurrence');
  const { today } = st;
  const year = month < today.m || (month === today.m && today.d > 1) ? today.y + 1 : today.y;
  st.res.startsAt = romeToDate(year, month, 1, DEFAULT_HOUR, 0);
};

const RECURRENCE_RE = new RegExp(
  `\\bogni\\s+(?:(\\d+)\\s+)?(giorn[oi]|settiman[ae]|mes[ei]|ann[oi]|${WEEKDAY_PATTERN})(?![\\p{L}])`,
  'iu',
);

/** «ogni 3 giorni», «ogni settimana», «ogni giovedì». Per un giorno della settimana la partenza è la prossima occorrenza. */
export const extractRecurrence: ParseStage = (st) => {
  if (st.res.rrule) {
    return;
  }
  const m = RECURRENCE_RE.exec(st.src);
  if (!m) {
    return;
  }
  const n = m[1] ? Number(m[1]) : 1;
  const unit = normalizeText(m[2]);
  const interval = n > 1 ? `;INTERVAL=${n}` : '';
  let weekday = -1;
  if (unit.startsWith('giorn')) {
    st.res.rrule = `FREQ=DAILY${interval}`;
  } else if (unit.startsWith('settim')) {
    st.res.rrule = `FREQ=WEEKLY${interval}`;
  } else if (unit.startsWith('mes')) {
    st.res.rrule = `FREQ=MONTHLY${interval}`;
  } else if (unit.startsWith('ann')) {
    st.res.rrule = `FREQ=YEARLY${interval}`;
  } else {
    weekday = WEEKDAYS_IT.findIndex((w) => normalizeText(w) === unit);
    st.res.rrule = `FREQ=WEEKLY;BYDAY=${BYDAY_CODES[weekday]}${interval}`;
  }
  take(st, m, 'recurrence');
  if (weekday >= 0) {
    const delta = (weekday - st.today.dow + 7) % 7; // «ogni giovedì» detto di giovedì: oggi
    const d = romeParts(addDaysRome(st.now, delta));
    st.res.startsAt = romeToDate(d.y, d.m, d.d, DEFAULT_HOUR, 0);
  }
};

/** Se una ricorrenza ha già fissato la data di partenza, il giorno parte da lì. */
export const seedDayFromRecurrence: ParseStage = (st) => {
  if (!st.res.startsAt) {
    return;
  }
  const { y, m, d } = romeParts(st.res.startsAt);
  st.day = { y, m, d };
};

// ------------------------------------------------------------------ giorno
// Chain of Responsibility: i risolutori si provano in ordine e il primo che riconosce un giorno vince.

type DayResolver = (st: ParseState) => Ymd | null;

/** «tra 3 giorni», «tra una settimana», «tra 2 mesi». */
const resolveRelative: DayResolver = (st) => {
  const m =
    /\btra\s+(\d+|un|uno|una|due|tre|quattro|cinque|sei|sette|otto|nove|dieci)\s+(giorn[oi]|settiman[ae]|mes[ei]|ann[oi])\b/iu.exec(
      st.src,
    );
  if (!m) {
    return null;
  }
  const n = parseCount(m[1]);
  const unit = m[2].toLowerCase();
  const { y, m: mo, d } = st.today;
  take(st, m, 'date');
  if (unit.startsWith('giorn')) {
    return { y, m: mo, d: d + n };
  }
  if (unit.startsWith('sett')) {
    return { y, m: mo, d: d + 7 * n };
  }
  if (unit.startsWith('mes')) {
    return { y, m: mo + n, d };
  }
  return { y: y + n, m: mo, d };
};

const MONTH_ALTERNATION = `${MONTHS_IT.join('|')}|${MONTHS_IT.map((x) => x.slice(0, 3)).join('|')}`; // anche «31 dic», «15 gen.»

/** «il 12 novembre», «12 novembre 2026», «12/11», «12/11/2026». Senza anno: il prossimo che non sia già passato. */
const resolveAbsolute: DayResolver = (st) => {
  let m = new RegExp(`\\b(?:il\\s+)?(\\d{1,2})\\s+(${MONTH_ALTERNATION})\\b\\.?(?:\\s+(\\d{4}))?`, 'iu').exec(
    st.src,
  );
  let dd = 0;
  let mm = 0;
  let yy = 0;
  if (m) {
    dd = Number(m[1]);
    const name = m[2].toLowerCase();
    mm = MONTHS_IT.findIndex((x) => x === name || x.slice(0, 3) === name) + 1;
    yy = m[3] ? Number(m[3]) : 0;
  } else {
    m = /\b(?:il\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/.exec(st.src);
    if (m) {
      dd = Number(m[1]);
      mm = Number(m[2]);
      yy = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : 0;
    }
  }
  if (!m || dd < 1 || dd > 31 || mm < 1 || mm > 12) {
    return null;
  }
  const { today } = st;
  let y = yy || today.y;
  if (!yy && Date.UTC(y, mm - 1, dd) < Date.UTC(today.y, today.m - 1, today.d)) {
    y++;
  }
  take(st, m, 'date');
  return { y, m: mm, d: dd };
};

/** «il 15»: giorno del mese, il prossimo mese se è già passato. */
const resolveDayOfMonth: DayResolver = (st) => {
  const m = /\bil\s+(\d{1,2})\b(?!\s*[:.]\d)/iu.exec(st.src);
  if (!m || Number(m[1]) < 1 || Number(m[1]) > 31) {
    return null;
  }
  const dd = Number(m[1]);
  const { today } = st;
  take(st, m, 'date');
  return { y: today.y, m: dd < today.d ? today.m + 1 : today.m, d: dd };
};

/** «giovedì», «il prossimo lunedì»: sempre nel futuro (se è oggi, tra una settimana). */
const resolveWeekday: DayResolver = (st) => {
  const m = new RegExp(
    `\\b(?:(?:il\\s+)?prossim[oa]\\s+|(?:di|il)\\s+)?(${WEEKDAY_PATTERN})(?![\\p{L}])(?:\\s+prossimo)?`,
    'iu',
  ).exec(st.src);
  if (!m) {
    return null;
  }
  const name = normalizeText(m[1]);
  const weekday = WEEKDAYS_IT.findIndex((x) => normalizeText(x) === name);
  const { today } = st;
  take(st, m, 'date');
  return { y: today.y, m: today.m, d: today.d + ((weekday - today.dow + 7) % 7 || 7) };
};

const KEYWORD_OFFSET: Record<string, number> = {
  dopodomani: 2,
  domani: 1,
  stasera: 0,
  stamattina: 0,
  oggi: 0,
};

/** «oggi», «domani», «dopodomani», «stasera» (che fissa anche le 20:00). */
const resolveKeyword: DayResolver = (st) => {
  const m = /\b(dopodomani|domani|stasera|stamattina|oggi)\b/iu.exec(st.src);
  if (!m) {
    return null;
  }
  const word = m[1].toLowerCase();
  const { today } = st;
  const day = { y: today.y, m: today.m, d: today.d + KEYWORD_OFFSET[word] };
  take(st, m, 'date');
  if (word === 'stasera') {
    st.res.startsAt = romeToDate(day.y, day.m, day.d, EVENING_HOUR, 0);
  }
  return day;
};

const DAY_RESOLVERS: DayResolver[] = [
  resolveRelative,
  resolveAbsolute,
  resolveDayOfMonth,
  resolveWeekday,
  resolveKeyword,
];

export const extractDay: ParseStage = (st) => {
  for (const resolve of DAY_RESOLVERS) {
    if (st.day) {
      return;
    }
    st.day = resolve(st);
  }
};

// ------------------------------------------------------------------ orario

const TIME_RESOLVERS: { re: RegExp; read: (m: RegExpExecArray) => { h: number; min: number } }[] = [
  {
    re: /\b(?:alle|ore|h)\s*(\d{1,2})(?:[:.](\d{2}))?\b/iu,
    read: (m) => ({ h: Number(m[1]), min: m[2] ? Number(m[2]) : 0 }),
  },
  { re: /\b(\d{1,2})[:.](\d{2})\b/, read: (m) => ({ h: Number(m[1]), min: Number(m[2]) }) },
  { re: /\bmezzogiorno\b/iu, read: () => ({ h: 12, min: 0 }) },
  { re: /\bmezzanotte\b/iu, read: () => ({ h: 0, min: 0 }) },
];

/** «alle 15», «ore 9.30», «15:30», «mezzogiorno»; «di sera/pomeriggio» sposta le ore 1-11 al pomeriggio. */
export const extractTime: ParseStage = (st) => {
  for (const { re, read } of TIME_RESOLVERS) {
    const m = re.exec(st.src);
    if (!m) {
      continue;
    }
    st.time = read(m);
    take(st, m, 'time');
    break;
  }
  if (st.time && (st.time.h > 23 || st.time.min > 59)) {
    st.time = null;
  }
  const pm = /\b(?:di|del)\s+(sera|pomeriggio)\b/iu.exec(st.src);
  if (pm && st.time && st.time.h < 12) {
    st.time.h += 12;
  }
  if (pm && st.time) {
    st.src = mask(st.src, pm.index, pm.index + pm[0].length);
  }
};

// ------------------------------------------------------------------ composizione

/** Ricorrenza di oggi con orario già passato («ogni giovedì alle 8», detto giovedì alle 10): parte dalla settimana prossima. */
function skipPassedRecurrenceToday(st: ParseState, time: Hm, today: Ymd, nowMinutes: number): void {
  const { day, res } = st;
  if (day && res.rrule && res.startsAt && isSameDay(day, today) && minutesOfDay(time) <= nowMinutes) {
    st.day = { ...day, d: day.d + 7 };
  }
}

/** Solo orario, senza giorno: oggi se non è già passato, altrimenti domani. */
function dayForTimeOnly(time: Hm, today: Ymd, nowMinutes: number): Ymd {
  return { ...today, d: today.d + (minutesOfDay(time) <= nowMinutes ? 1 : 0) };
}

/** Scrive `startsAt` dal giorno risolto; senza orario esplicito tiene quello già impostato (es. da una ricorrenza) o le 9:00. */
function writeStartsAt(st: ParseState, day: Ymd, time: Hm | null): void {
  const previous = st.res.startsAt ? romeParts(st.res.startsAt) : null;
  const hour = time ? time.h : (previous?.h ?? DEFAULT_HOUR);
  const minute = time ? time.min : (previous?.min ?? 0);
  st.res.startsAt = romeToDate(day.y, day.m, day.d, hour, minute);
  st.res.hasTime = !!time || romeParts(st.res.startsAt).h !== DEFAULT_HOUR;
}

/** Unisce giorno e orario in `startsAt`, applicando le regole di default (solo orario → oggi o domani; 9:00 senza orario). */
export const composeStart: ParseStage = (st) => {
  const { time, today } = st;
  const nowMinutes = today.h * 60 + today.min;
  const todayYmd: Ymd = { y: today.y, m: today.m, d: today.d };

  if (time) {
    skipPassedRecurrenceToday(st, time, todayYmd, nowMinutes);
    st.day ??= dayForTimeOnly(time, todayYmd, nowMinutes);
  }
  if (st.day) {
    writeStartsAt(st, st.day, time);
  }
  if (time) {
    st.res.hasTime = true;
  }
};
