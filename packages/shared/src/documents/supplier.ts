const SUPPLIERS: [RegExp, string][] = [
  [/enel\s+energia/i, 'Enel Energia'],
  [/\benel\b/i, 'Enel'],
  [/\ba2a\b/i, 'A2A'],
  [/\bhera\b/i, 'Hera'],
  [/\biren\b/i, 'Iren'],
  [/edison/i, 'Edison'],
  [/plenitude/i, 'Eni Plenitude'],
  [/\bacea\b/i, 'Acea'],
  [/sorgenia/i, 'Sorgenia'],
  [/\bengie\b/i, 'Engie'],
  [/e\.?on\s+energia|\be\.on\b/i, 'E.ON'],
  [/\bagsm\b/i, 'AGSM'],
  [/acquedotto\s+pugliese/i, 'Acquedotto Pugliese'],
  [/abbanoa/i, 'Abbanoa'],
  [/\btim\b|telecom\s+italia/i, 'TIM'],
  [/vodafone/i, 'Vodafone'],
  [/wind\s*tre/i, 'WindTre'],
  [/fastweb/i, 'Fastweb'],
  [/\biliad\b/i, 'Iliad'],
  [/poste\s+italiane/i, 'Poste Italiane'],
  [/agenzia\s+(?:delle\s+)?entrate(?:\s*-?\s*riscossione)?/i, 'Agenzia delle Entrate'],
  [/\binps\b/i, 'INPS'],
  [/unipol/i, 'Unipol'],
  [/generali/i, 'Generali'],
  [/allianz/i, 'Allianz'],
  [/polizia\s+(?:locale|municipale)/i, 'Polizia Locale'],
];
const STOP =
  /^(reparto|via|viale|piazza|amministratore|studio|tel|telefono|p\.?iva|cf|codice|fattura|bolletta|verbale|referto|paziente|data|n\.?|numero)$/i;
const title = (w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();

const CONNECTOR = /^(di|del|della|dei)$/i;
const isNameWord = (w: string) => !STOP.test(w) && /^[\p{L}']+$/u.test(w);
const tidyName = (w: string) => (w.length > 2 && w === w.toUpperCase() ? title(w) : w);

/** Prime (al massimo due) parole di un nome proprio dopo la parola chiave, sulla stessa riga. */
function nameWords(rest: string): string[] {
  const words = rest
    .trim()
    .split(/[ \t]+/)
    .map((w) => w.replace(/[.,;:()]+$/g, ''))
    .filter(Boolean);
  const out: string[] = [];
  for (const w of words) {
    if (out.length >= 2 || !isNameWord(w)) {
      break;
    }
    if (out.length === 0 && CONNECTOR.test(w)) {
      continue;
    }
    out.push(tidyName(w));
  }
  return out;
}

/** Nome che segue una parola chiave sulla stessa riga: «Ospedale Cardarelli», «Condominio Garibaldi», «Comune di Napoli». */
function nameAfter(text: string, key: RegExp, prefix: string): string | null {
  const m = key.exec(text);
  if (!m) {
    return null;
  }
  const rest = text.slice((m.index ?? 0) + m[0].length).split(/\r?\n/)[0];
  const words = nameWords(rest);
  return words.length ? `${prefix} ${words.join(' ')}` : null;
}

export function pickSupplier(text: string): string | null {
  for (const [re, name] of SUPPLIERS) {
    if (re.test(text)) {
      return name;
    }
  }
  const asl = /\basl\s+([A-Za-z]+(?:\s+\d+)?)/i.exec(text);
  if (asl) {
    return `ASL ${asl[1].toUpperCase()}`;
  }
  return (
    nameAfter(text, /comune\s+di\b/i, 'Comune di') ??
    nameAfter(text, /\bpoliclinico\b/i, 'Policlinico') ??
    nameAfter(text, /\b(?:ospedale|azienda\s+ospedaliera)\b/i, 'Ospedale') ??
    nameAfter(text, /\bcondominio\b/i, 'Condominio')
  );
}
