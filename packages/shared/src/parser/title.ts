import { MAINTENANCE_TEMPLATES, PROCEDURE_TEMPLATES } from '../templates';
import { capitalize } from '../text';
import type { ParseStage } from './state';

const LEADING_FILLER_RE = /^(?:il|lo|la|alle|ore|di|del|a|per|ogni|entro|tra)\s+/iu;
const TRAILING_FILLER_RE = /\s+(?:il|lo|la|alle|ore|di|del|a|per|ogni|entro|tra|e|,)$/iu;

/** Titolo: il testo non riconosciuto, ripulito da preposizioni residue; per manutenzioni, pratiche e note ha regole proprie. */
export const buildTitle: ParseStage = (st) => {
  const { res, input } = st;
  let title = st.src
    .replace(/\s+/g, ' ')
    .trim()
    .replace(LEADING_FILLER_RE, '')
    .replace(TRAILING_FILLER_RE, '')
    .replace(/[,;]+$/, '')
    .trim();
  if (!title) {
    title = input.replace(/[#@]\S+/g, '').trim();
  }
  res.title = capitalize(title);
  if (res.kind === 'manutenzione') {
    res.title = MAINTENANCE_TEMPLATES.find((t) => t.key === res.templateKey)?.title || res.title;
  }
  if (res.kind === 'pratica') {
    res.title =
      res.title.replace(/^pratica\s*/i, '') ||
      PROCEDURE_TEMPLATES.find((t) => t.key === res.templateKey)?.title ||
      '';
  }
  if (res.kind === 'nota') {
    res.title = res.noteText ?? '';
  }
  res.tokens.sort((a, b) => a.start - b.start);
};
