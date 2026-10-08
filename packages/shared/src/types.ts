export type SpaceRole = 'owner' | 'admin' | 'member' | 'viewer';
/** Slug delle categorie predefinite (presenti in ogni spazio). Le categorie personalizzate non hanno slug. */
export type BuiltinCategory =
  'visita' | 'professionista' | 'burocrazia' | 'commissione' | 'scadenza' | 'altro';
export type ReminderChannel = 'email' | 'push';

export const CATEGORY_LABEL: Record<BuiltinCategory, string> = {
  visita: 'Visita',
  professionista: 'Professionista',
  burocrazia: 'Burocrazia',
  commissione: 'Commissione',
  scadenza: 'Scadenza',
  altro: 'Altro',
};

export const ROLE_LABEL: Record<SpaceRole, string> = {
  owner: 'Proprietario',
  admin: 'Amministratore',
  member: 'Membro',
  viewer: 'Solo lettura',
};

export const ACCENTS = ['terracotta', 'ocra', 'salvia', 'blu', 'prugna'] as const;
export type Accent = (typeof ACCENTS)[number];
export const ACCENT_HUE: Record<Accent, number> = {
  terracotta: 42,
  ocra: 85,
  salvia: 150,
  blu: 240,
  prugna: 330,
};

export const SPACE_HUES = [42, 85, 150, 200, 240, 290, 330, 15] as const;
