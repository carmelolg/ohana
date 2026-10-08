import { capitalize, normalizeText } from './text';

export const SHOPPING_CATEGORIES = [
  'Frutta e verdura',
  'Latticini',
  'Carne e pesce',
  'Panetteria',
  'Dispensa',
  'Bevande',
  'Casa e igiene',
  'Altro',
] as const;

const RULES: [string, RegExp][] = [
  [
    'Frutta e verdura',
    /\b(mel[ae]|pere?|banan\w*|arance?|limon\w*|pomodor\w*|insalata|zucchin\w*|carot\w*|patat\w*|cipoll\w*|aglio|spinaci|fragol\w*|uva|kiwi|frutta|verdura|peperon\w*|melanzan\w*|funghi|basilico|prezzemolo)\b/,
  ],
  ['Latticini', /\b(latte|yogurt|burro|formaggi?o?|mozzarella|parmigiano|ricotta|panna|uova|mascarpone)\b/],
  [
    'Carne e pesce',
    /\b(pollo|manzo|maiale|salsicc\w*|prosciutto|salame|tonno|salmone|pesce|merluzzo|carne|macinato|bresaola|wurstel)\b/,
  ],
  [
    'Panetteria',
    /\b(pane|pan carre|grissini|cracker|fette biscottate|focaccia|brioche|biscott\w*|cornett\w*)\b/,
  ],
  [
    'Dispensa',
    /\b(pasta|riso|farina|zucchero|sale|olio|aceto|caffe|te|tè|passata|pelati|legumi|ceci|fagioli|lenticchie|cereali|marmellata|nutella|miele|sugo|biscotti|scatolett\w*)\b/,
  ],
  ['Bevande', /\b(acqua|vino|birra|succo|succhi|cola|coca|aranciata|the|bibite?|spumante|prosecco)\b/],
  [
    'Casa e igiene',
    /\b(carta igienica|scottex|detersiv\w*|sapone|shampoo|dentifricio|spugn\w*|sacchett\w*|pannolini|ammorbidente|candeggina|lavastoviglie|deodorante|bagnoschiuma|rotolo|fazzoletti)\b/,
  ],
];

export function categorizeItem(text: string): string {
  const t = normalizeText(text);
  for (const [cat, re] of RULES) {
    if (re.test(t)) {
      return cat;
    }
  }
  return 'Altro';
}

export interface NewItem {
  text: string;
  qty: string | null;
  category: string;
}

/** "latte, 2 pane, uova x6" → voci separate da virgola/punto e virgola/a capo, con quantità. */
export function parseShoppingInput(input: string): NewItem[] {
  return input
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((raw) => {
      let text = raw;
      let qty: string | null = null;
      let m = /^(\d+(?:[.,]\d+)?\s?(?:kg|g|l|ml|pz|x)?)\s+(?:di\s+)?(.+)$/i.exec(text);
      if (m) {
        qty = m[1].replace(/\s+/g, '');
        text = m[2];
      } else if ((m = /^(.+?)\s+x\s?(\d+)$/i.exec(text))) {
        text = m[1];
        qty = m[2];
      }
      text = capitalize(text);
      return { text, qty, category: categorizeItem(text) };
    });
}
