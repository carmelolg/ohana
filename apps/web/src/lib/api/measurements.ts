import { isoDayRome, measuresFromReadings } from '@ohana/shared';
import type { Mutate } from '../data';
import { newId } from '../outbox';

interface Target {
  spaceId: string;
  recipientId: string;
  threadId: string | null;
}

export interface MeasurementToSave extends Target {
  type: string;
  value: number;
  value2?: number | null;
  at: Date;
  note?: string;
}

export const recordMeasurement = (mutate: Mutate, m: MeasurementToSave) =>
  mutate({
    table: 'measurements',
    action: 'upsert',
    payload: {
      id: newId(),
      space_id: m.spaceId,
      recipient_id: m.recipientId,
      thread_id: m.threadId,
      type: m.type,
      value: m.value,
      value2: m.value2 ?? null,
      measured_at: m.at.toISOString(),
      note: m.note?.trim() || null,
    },
  });

export const deleteMeasurement = (mutate: Mutate, id: string) =>
  mutate({ table: 'measurements', action: 'delete', match: { id } });

export interface EpisodeToSave extends Target {
  /** «Palpitazioni dopo cena». */
  title: string;
  text: string;
  /** Valori misurati nell'episodio, ad esempio `{ heart_rate: 112 }`. */
  readings: Record<string, unknown>;
  at: Date;
}

/** Un episodio è un tassello del filone; i valori misurati vanno anche nei grafici dei parametri. */
export async function recordEpisode(mutate: Mutate, e: EpisodeToSave): Promise<string> {
  if (!e.threadId) {
    throw new Error('Scegli il filone a cui appartiene l’episodio');
  }
  const id = newId();
  await mutate({
    table: 'care_entries',
    action: 'upsert',
    payload: {
      id,
      space_id: e.spaceId,
      recipient_id: e.recipientId,
      thread_id: e.threadId,
      type: 'episodio',
      entry_date: isoDayRome(e.at),
      title: e.title.trim(),
      text: e.text.trim() || null,
      readings: e.readings,
    },
  });
  for (const m of measuresFromReadings(e.readings)) {
    await recordMeasurement(mutate, { ...e, ...m, note: e.title });
  }
  return id;
}
