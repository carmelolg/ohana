import { addDaysRome, isoDayRome, romeParts, startOfDayRome } from '../dates';

export type ParamKey = 'heart_rate' | 'blood_pressure' | 'weight' | 'stools_per_day';

interface ParamInfo {
  label: string;
  /** Nome breve per i chip. */
  chip: string;
  unit: string;
  decimals: number;
}

export const CARE_PARAMS: Record<ParamKey, ParamInfo> = {
  heart_rate: { label: 'Frequenza cardiaca', chip: 'Freq. cardiaca', unit: 'bpm', decimals: 0 },
  blood_pressure: { label: 'Pressione', chip: 'Pressione', unit: 'mmHg', decimals: 0 },
  weight: { label: 'Peso', chip: 'Peso', unit: 'kg', decimals: 1 },
  stools_per_day: { label: 'Scariche', chip: 'Scariche', unit: 'al giorno', decimals: 0 },
};

export const PARAM_KEYS = Object.keys(CARE_PARAMS) as ParamKey[];
export const isParamKey = (key: string): key is ParamKey => key in CARE_PARAMS;

/** Valori che compaiono nei tasselli: i parametri più quelli degli esami. */
const EXAM_READINGS: Record<string, { label: string; unit: string }> = {
  calprotectin_ugg: { label: 'Calprotectina fecale', unit: 'µg/g' },
  crp_mgdl: { label: 'PCR', unit: 'mg/dl' },
};

export function readingInfo(key: string): { label: string; unit: string } {
  if (isParamKey(key)) {
    return { label: CARE_PARAMS[key].label, unit: CARE_PARAMS[key].unit };
  }
  return EXAM_READINGS[key] ?? { label: key.replace(/_/g, ' '), unit: '' };
}

const numberFmt = (decimals: number) =>
  new Intl.NumberFormat('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: decimals });

/** Numero all'italiana (virgola decimale), senza zeri inutili. */
export const formatCareNumber = (n: number, decimals = 1): string => numberFmt(decimals).format(n);

/** «132/80» → [132, 80]; qualunque altro testo → `null`. */
export function parsePressure(text: string): [number, number] | null {
  const m = /^\s*(\d{2,3})\s*[/-]\s*(\d{2,3})\s*$/.exec(text);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

export const formatPressure = (high: number, low: number | null | undefined): string =>
  low == null ? String(high) : `${high}/${low}`;

/** Valore di un tassello con la sua unità: «112 bpm», «132/80 mmHg», «320 µg/g». */
export function formatReading(key: string, value: unknown): string {
  const unit = readingInfo(key).unit;
  const text = typeof value === 'number' ? formatCareNumber(value) : String(value);
  return unit ? `${text} ${unit}` : text;
}

export interface MeasureLike {
  type: string;
  value: number;
  measured_at: string;
}

export interface WeekBucket {
  /** Lunedì della settimana, mezzanotte di Roma. */
  start: Date;
  average: number | null;
  count: number;
  /** C'è stato almeno un episodio in questa settimana. */
  episode: boolean;
}

function mondayOf(date: Date): Date {
  const day = startOfDayRome(date);
  return addDaysRome(day, -((romeParts(day).dow + 6) % 7));
}

/**
 * Media settimanale di un parametro (per la pressione: la massima) sulle ultime `weeks` settimane, dalla più vecchia
 * alla corrente. Le settimane con un episodio sono segnalate, anche se non hanno misure.
 */
export function weeklyAverages(
  measures: MeasureLike[],
  episodeDays: string[],
  type: string,
  now: Date,
  weeks = 8,
): WeekBucket[] {
  const thisMonday = mondayOf(now);
  return Array.from({ length: weeks }, (_, i) => {
    const start = addDaysRome(thisMonday, -7 * (weeks - 1 - i));
    const startMs = start.getTime();
    const endMs = addDaysRome(start, 7).getTime();
    const inWeek = measures.filter((m) => {
      const t = new Date(m.measured_at).getTime();
      return m.type === type && t >= startMs && t < endMs;
    });
    const sum = inWeek.reduce((acc, m) => acc + m.value, 0);
    const first = isoDayRome(start);
    const last = isoDayRome(addDaysRome(start, 6));
    return {
      start,
      average: inWeek.length ? sum / inWeek.length : null,
      count: inWeek.length,
      episode: episodeDays.some((d) => d >= first && d <= last),
    };
  });
}

export interface ReadingMeasure {
  type: string;
  value: number;
  value2: number | null;
}

/**
 * Valori di un tassello (`{heart_rate: 112, blood_pressure: "132/80"}`) → misure per i grafici. Contano solo i
 * parametri monitorabili; gli altri valori (esami) restano nel tassello.
 */
export function measuresFromReadings(readings: Record<string, unknown>): ReadingMeasure[] {
  return Object.entries(readings).flatMap(([type, raw]): ReadingMeasure[] => {
    if (!isParamKey(type)) {
      return [];
    }
    if (type === 'blood_pressure') {
      const pair = typeof raw === 'string' ? parsePressure(raw) : null;
      return pair ? [{ type, value: pair[0], value2: pair[1] }] : [];
    }
    const value = typeof raw === 'number' ? raw : Number(String(raw).replace(',', '.'));
    return Number.isFinite(value) ? [{ type, value, value2: null }] : [];
  });
}

/** Numero scritto in un campo: accetta la virgola. `null` se non è un numero. */
export function parseCareNumber(text: string): number | null {
  const value = Number(text.trim().replace(',', '.'));
  return text.trim() !== '' && Number.isFinite(value) ? value : null;
}
