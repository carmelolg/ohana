import { romeParts, romeToDate } from './dates';
import { classifyKind, extractCategory } from './parser/classify';
import { extractAssignee, extractContact, extractSpace } from './parser/mentions';
import {
  composeStart,
  extractDay,
  extractRecurrence,
  extractReminder,
  extractTime,
  extractYearlyMonthRecurrence,
  seedDayFromRecurrence,
} from './parser/schedule';
import { createState, type ParseStage } from './parser/state';
import { buildTitle } from './parser/title';
import type { ParseContext, ParsedEvent } from './parser/types';

export type { ParseContext, ParsedEvent, ParsedKind, Token, TokenKind } from './parser/types';

/**
 * Ordine degli stadi: ognuno oscura ciò che riconosce, quindi i più specifici vanno prima
 * (menzioni → promemoria → ricorrenze → giorno → orario → composizione → categoria → tipo → titolo).
 */
const PIPELINE: ParseStage[] = [
  extractSpace,
  extractAssignee,
  extractReminder,
  extractYearlyMonthRecurrence,
  extractRecurrence,
  seedDayFromRecurrence,
  extractDay,
  extractTime,
  composeStart,
  extractContact,
  extractCategory,
  classifyKind,
  buildTitle,
];

/**
 * Parser locale per l'aggiunta rapida in italiano.
 * Riconosce #spazio, @nome, promemoria, ricorrenze, date relative/assolute, orari,
 * contatti della rubrica e categoria dalle parole chiave. Il resto diventa il titolo.
 */
export function parseQuick(input: string, now: Date, ctx: ParseContext = {}): ParsedEvent {
  const state = createState(input, now, ctx);
  for (const stage of PIPELINE) {
    stage(state);
  }
  return state.res;
}

/**
 * Scadenza di una nota in bacheca dal testo: «fino a domenica», «fino al 12 novembre», «fino a domani».
 * Restituisce la fine di quel giorno (23:59 a Roma) oppure null.
 */
export function parseNoteExpiry(text: string, now: Date): Date | null {
  const m = /\bfino\s+(?:a|al|ad|alle?)\s+(.+?)(?:[.,;!?]|$)/i.exec(text);
  if (!m) {
    return null;
  }
  const parsed = parseQuick(m[1], now);
  if (!parsed.startsAt) {
    return null;
  }
  const p = romeParts(parsed.startsAt);
  const end = romeToDate(p.y, p.m, p.d, 23, 59);
  return end > now ? end : null;
}
