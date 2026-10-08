import { normalizeText } from '../text';
import { take, type ParseStage } from './state';

/** `#spazio` → id dello spazio, se il nome inizia come il testo digitato. */
export const extractSpace: ParseStage = (st) => {
  for (const m of [...st.src.matchAll(/#([\p{L}\d_-]+)/gu)]) {
    const q = normalizeText(m[1].replace(/[_-]/g, ' '));
    const compact = q.replace(/\s+/g, '');
    const space = st.ctx.spaces?.find(
      (s) =>
        normalizeText(s.name).replace(/\s+/g, '').startsWith(compact) || normalizeText(s.name).startsWith(q),
    );
    if (space) {
      st.res.spaceId = space.id;
      take(st, m as RegExpExecArray, 'space');
    }
  }
};

/** `@nome` → id del membro, confrontando nome mostrato e alias parola per parola. */
export const extractAssignee: ParseStage = (st) => {
  for (const m of [...st.src.matchAll(/@([\p{L}\d_-]+)/gu)]) {
    const q = normalizeText(m[1]);
    const member = st.ctx.members?.find((p) =>
      [p.name, ...(p.aliases ?? [])].some((n) =>
        normalizeText(n)
          .split(/\s+/)
          .some((w) => w.startsWith(q)),
      ),
    );
    if (member) {
      st.res.assigneeId = member.id;
      take(st, m as RegExpExecArray, 'assignee');
    }
  }
};

/** Contatto della rubrica citato per nome: il nome resta nel titolo, quindi il testo non viene oscurato. */
export const extractContact: ParseStage = (st) => {
  const hay = normalizeText(st.src);
  for (const c of st.ctx.contacts ?? []) {
    const idx = hay.indexOf(normalizeText(c.name));
    if (idx >= 0 && c.name.trim()) {
      st.res.contactId = c.id;
      st.tokens.push({
        start: idx,
        end: idx + c.name.length,
        kind: 'contact',
        text: st.input.slice(idx, idx + c.name.length),
      });
      return;
    }
  }
};
