import { describe, expect, it } from 'vitest';
import { snoozeMessage, snoozeOptions } from './snoozeOptions';

describe('snoozeOptions', () => {
  it('di mattina propone 1 ora, stasera e domani', () => {
    const labels = snoozeOptions(new Date('2026-10-12T08:00:00Z')).map((o) => o.label);
    expect(labels).toEqual(['Tra 1 ora', 'Stasera', 'Domani']);
  });
  it('dopo le 19 non propone «stasera»', () => {
    const labels = snoozeOptions(new Date('2026-10-12T18:30:00Z')).map((o) => o.label);
    expect(labels).toEqual(['Tra 1 ora', 'Domani']);
  });
  it('stasera cade alle 20:00 di Roma', () => {
    const evening = snoozeOptions(new Date('2026-10-12T08:00:00Z')).find((o) => o.label === 'Stasera')!;
    expect(evening.minutes).toBe(10 * 60); // 10:00 Roma (CEST) → 20:00
  });
  it('messaggi', () => {
    expect(snoozeMessage(1440)).toBe('Rimandato a domani');
    expect(snoozeMessage(60)).toBe('Rimandato di 1 ora');
    expect(snoozeMessage(300)).toBe('Rimandato a stasera');
  });
});
