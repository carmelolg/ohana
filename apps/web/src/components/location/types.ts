/** Luogo scelto: testo (sempre) e coordinate (se scelto sulla mappa). */
export interface LocationValue {
  text: string;
  lat: number | null;
  lng: number | null;
}

export const NO_LOCATION: LocationValue = { text: '', lat: null, lng: null };
