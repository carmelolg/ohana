export interface NamedPerson {
  first_name: string;
  last_name: string;
  nickname?: string | null;
}

/** Nome mostrato agli altri: il soprannome se c'è, altrimenti «Nome Cognome». */
export const fullName = (p?: NamedPerson | null): string =>
  p ? p.nickname?.trim() || `${p.first_name} ${p.last_name}`.trim() : '';

/** Come ci si rivolge alla persona (saluti, email, push): soprannome o nome. */
export const shortName = (p?: Pick<NamedPerson, 'first_name' | 'nickname'> | null): string =>
  p ? p.nickname?.trim() || p.first_name.trim() : '';
