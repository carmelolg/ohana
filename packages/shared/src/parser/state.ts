import { romeParts, type RomeParts } from '../dates';
import type { ParseContext, ParsedEvent, Token, TokenKind } from './types';

export interface Ymd {
  y: number;
  m: number;
  d: number;
}
export interface Hm {
  h: number;
  min: number;
}

/**
 * Stato condiviso dagli stadi del parser. Ogni stadio riconosce una porzione di testo, la «oscura» in `src`
 * (così gli stadi successivi non la rileggono) e scrive il risultato in `res`.
 */
export interface ParseState {
  readonly input: string;
  readonly now: Date;
  readonly today: RomeParts;
  readonly ctx: ParseContext;
  readonly tokens: Token[];
  readonly res: ParsedEvent;
  /** Testo con i frammenti già riconosciuti sostituiti da spazi (gli indici restano quelli di `input`). */
  src: string;
  /** Giorno risolto (può eccedere il mese: `romeToDate` normalizza). */
  day: Ymd | null;
  /** Orario esplicito indicato dall'utente. */
  time: Hm | null;
}

/** Uno stadio del parser: legge e modifica lo stato. */
export type ParseStage = (st: ParseState) => void;

export function createState(input: string, now: Date, ctx: ParseContext): ParseState {
  const tokens: Token[] = [];
  const res: ParsedEvent = {
    kind: 'appuntamento',
    templateKey: null,
    noteText: null,
    title: '',
    startsAt: null,
    hasTime: false,
    category: 'altro',
    categoryId: null,
    categoryRecognized: false,
    spaceId: null,
    assigneeId: null,
    contactId: null,
    reminderMinutes: null,
    rrule: null,
    tokens,
  };
  return { input, now, today: romeParts(now), ctx, tokens, res, src: input, day: null, time: null };
}

export function mask(src: string, start: number, end: number): string {
  return src.slice(0, start) + ' '.repeat(end - start) + src.slice(end);
}

/** Registra il frammento come token e lo oscura nel testo ancora da leggere. */
export function take(st: ParseState, m: RegExpExecArray, kind: TokenKind): void {
  st.tokens.push({ start: m.index, end: m.index + m[0].length, kind, text: m[0] });
  st.src = mask(st.src, m.index, m.index + m[0].length);
}

export const minutesOfDay = (t: Hm): number => t.h * 60 + t.min;
export const isSameDay = (a: Ymd, b: Ymd): boolean => a.y === b.y && a.m === b.m && a.d === b.d;
