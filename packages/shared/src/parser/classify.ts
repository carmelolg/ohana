import { romeParts, romeToDate } from '../dates';
import {
  MAINTENANCE_TEMPLATES,
  PROCEDURE_TEMPLATES,
  type MaintenanceTemplate,
  type ProcedureTemplate,
} from '../templates';
import { escapeRegExp, normalizeText } from '../text';
import type { ParseState, ParseStage } from './state';
import { CATEGORY_WORDS, CHORE_RE, NEEDS_VERB } from './vocabulary';

/** Categoria: prima le personalizzate dello spazio (nome o parole chiave), poi le parole chiave predefinite. */
export const extractCategory: ParseStage = (st) => {
  const { res, ctx } = st;
  const idOf = (slug: string) => ctx.categories?.find((c) => c.slug === slug)?.id ?? null;
  const hay = normalizeText(st.src);
  const asWord = (term: string) =>
    new RegExp(`(^|[^a-z0-9])${escapeRegExp(normalizeText(term.trim()))}($|[^a-z0-9])`);
  const custom = (ctx.categories ?? []).find(
    (c) => !c.slug && [c.name, ...c.keywords].some((t) => t.trim() && asWord(t).test(hay)),
  );
  if (custom) {
    res.category = custom.name;
    res.categoryId = custom.id;
    res.categoryRecognized = true;
    return;
  }
  for (const [category, re] of CATEGORY_WORDS) {
    const m = re.exec(st.src);
    if (!m) {
      continue;
    }
    res.category = category;
    res.categoryId = idOf(category);
    res.categoryRecognized = true;
    st.tokens.push({ start: m.index, end: m.index + m[0].length, kind: 'category', text: m[0] });
    return;
  }
  res.categoryId = idOf('altro');
};

const NOTE_PREFIX_RE = /^\s*(?:nota|bacheca|avviso)\s*[:-]\s*([\s\S]+)$/i;
const SCAN_PREFIX_RE = /^\s*(?:scansiona|scansione|scannerizza)\b/;
const PROCEDURE_PREFIX_RE = /^\s*pratica\b/;
const PROCEDURE_VERB_RE = /\b(rinnov\w*|pratica|rifare)\b/;

/** Ciò che serve alle regole per decidere il tipo di voce. */
interface KindContext {
  st: ParseState;
  /** Testo originale senza accenti né maiuscole. */
  hay: string;
  note: RegExpExecArray | null;
  maintenance: MaintenanceTemplate | undefined;
  procedure: ProcedureTemplate | undefined;
  recurring: boolean;
  /** L'utente ha indicato un orario: non può essere una faccenda né una pratica. */
  timed: boolean;
}

interface KindRule {
  applies: (c: KindContext) => boolean;
  apply: (c: KindContext) => void;
}

// Chain of Responsibility: la prima regola che si applica decide il tipo.
const KIND_RULES: KindRule[] = [
  {
    applies: (c) => !!c.note,
    apply: (c) => {
      c.st.res.kind = 'nota';
      c.st.res.noteText = c.note![1].trim();
    },
  },
  {
    applies: (c) => SCAN_PREFIX_RE.test(c.hay),
    apply: (c) => {
      c.st.res.kind = 'scansione';
    },
  },
  {
    applies: (c) => !!c.maintenance && (c.recurring || /\bmanutenzion/.test(c.hay)),
    apply: (c) => {
      const { res } = c.st;
      res.kind = 'manutenzione';
      res.templateKey = c.maintenance!.key;
      if (!res.rrule) {
        res.rrule = c.maintenance!.rrule;
      }
    },
  },
  {
    // per carta d'identità e patente serve anche un verbo di pratica, altrimenti «scadenza carta d'identità» sarebbe una pratica
    applies: (c) =>
      !!c.procedure &&
      !c.recurring &&
      !c.timed &&
      (!NEEDS_VERB.has(c.procedure.key) || PROCEDURE_VERB_RE.test(c.hay)),
    apply: (c) => {
      c.st.res.kind = 'pratica';
      c.st.res.templateKey = c.procedure!.key;
    },
  },
  {
    applies: (c) => PROCEDURE_PREFIX_RE.test(c.hay),
    apply: (c) => {
      c.st.res.kind = 'pratica';
      c.st.res.templateKey = 'custom';
    },
  },
  {
    applies: (c) => c.recurring && !c.timed && (CHORE_RE.test(c.hay) || !!c.st.res.assigneeId),
    apply: (c) => makeChore(c.st),
  },
];

/** Tipo di voce: nota, scansione, manutenzione, pratica, faccenda o impegno. */
export const classifyKind: ParseStage = (st) => {
  const hay = normalizeText(st.input);
  const mentions = (t: { keywords: string[] }) => t.keywords.some((k) => hay.includes(normalizeText(k)));
  const context: KindContext = {
    st,
    hay,
    note: NOTE_PREFIX_RE.exec(st.input),
    maintenance: MAINTENANCE_TEMPLATES.find(mentions),
    procedure: PROCEDURE_TEMPLATES.find(mentions),
    recurring: !!st.res.rrule,
    timed: !!st.time,
  };
  KIND_RULES.find((rule) => rule.applies(context))?.apply(context);
};

/** Una faccenda ha solo il giorno, mai l'orario. */
function makeChore({ res }: ParseState): void {
  res.kind = 'faccenda';
  if (!res.startsAt) {
    return;
  }
  const p = romeParts(res.startsAt);
  res.startsAt = romeToDate(p.y, p.m, p.d);
  res.hasTime = false;
}
